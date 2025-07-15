import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { CustomRequest } from '../middlewares/authenticate';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import PDFDocument from 'pdfkit';
import { sendOrderConfirmationEmail } from '../email/sendOrderConfirmationEmail';
import { sendNotification } from '../utils/notification';
import { sendOrderStatusUpdateEmail } from '../email/orderStatusMail';

type OrderItemInput = {
  productId?: number;
  variantId?: number;
  quantity: number;
  price: number;
};

// Create new order for authenticated user
export const createOrder = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;

  const {
    items,
    addressId,
    totalAmount,
    paymentMethod,
    discountAmount = 0,
    subtotal,
    discountCode = '',
    billingAddress,
    shippingAddress,
    cartId,
  }: {
    items: OrderItemInput[];
    addressId: number;
    totalAmount: number;
    paymentMethod: string;
    discountAmount?: number;
    subtotal: number;
    discountCode?: string;
    billingAddress: string;
    shippingAddress: string;
    cartId?: number
  } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!subtotal || !totalAmount) {
    res.status(400).json({ message: 'Invalid json' });
    return;
  }

  try {
    const createItems = items.map((item, idx) => {
      const hasProduct = typeof item.productId === 'number';
      const hasVariant = typeof item.variantId === 'number';

      if (!hasProduct && !hasVariant) {
        throw new Error(`Item ${idx + 1}: Must have either productId or variantId.`);
      }

      if (hasProduct && hasVariant) {
        throw new Error(`Item ${idx + 1}: Cannot have both productId and variantId.`);
      }

      return {
        productId: hasProduct ? item.productId : null,
        variantId: hasVariant ? item.variantId : null,
        quantity: item.quantity,
        price: item.price,
      };
    });

    // // Calculate final amount after discount (never below zero)
    // const finalAmount = Math.max(totalAmount - discountAmount, 0);

    const paymentStatus =
      paymentMethod.toUpperCase() === 'RAZORPAY'
        ? PaymentStatus.SUCCESS
        : PaymentStatus.PENDING;

    const payment = await prisma.payment.create({
      data: {
        method: paymentMethod,
        status: paymentStatus,
      },
    });

    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) {
      res.status(400).json({ message: 'Invalid address ID' });
      return
    }

    // 2. Get delivery pincode state
    const pincodeEntry = await prisma.pincode.findUnique({
      where: { zipcode: Number(address.pincode) },
    });
    if (!pincodeEntry) {
      res.status(400).json({ message: 'Delivery not available for this pincode' });
      return
    }
    const deliveryState = pincodeEntry.state;

    // 3. Get company settings
    const company = await prisma.companySettings.findFirst();
    if (!company) {
      res.status(500).json({ message: 'Company settings not configured' });
      return
    }

    // 4. Determine tax type
    // const isInterState = deliveryState !== company.company_state;
    // const isInclusive = company.is_tax_inclusive;

    const taxRates = await prisma.tax.findMany({
      where: { is_active: true },
    });

    const cgst = taxRates.find(t => t.name.toUpperCase() === 'CGST')?.percentage ?? 0;
    const sgst = taxRates.find(t => t.name.toUpperCase() === 'SGST')?.percentage ?? 0;
    const igst = taxRates.find(t => t.name.toUpperCase() === 'IGST')?.percentage ?? 0;

    const isInterState = deliveryState !== company.company_state;
    const isInclusive = company.is_tax_inclusive;

    const appliedTaxRate = isInterState ? igst : cgst + sgst;

    let taxAmount = 0;
    let baseAmount = subtotal;

    if (isInclusive) {
      baseAmount = subtotal / (1 + appliedTaxRate / 100);
      taxAmount = subtotal - baseAmount;
    } else {
      taxAmount = subtotal * (appliedTaxRate / 100);
    }

    const totalBeforeDiscount = isInclusive ? subtotal : subtotal + taxAmount;
    const finalAmount = Math.max(totalBeforeDiscount - discountAmount, 0);



    const order = await prisma.order.create({
      data: {
        userId,
        addressId,
        subtotal:baseAmount,
        totalAmount:totalBeforeDiscount,
        finalAmount, 
        discountAmount,
        discountCode,
        billingAddress,
        shippingAddress,
        taxAmount,
        taxType: isInterState ? 'IGST' : 'CGST+SGST',
        appliedTaxRate,
        isTaxInclusive: isInclusive,
        status: OrderStatus.PENDING,
        paymentId: payment.id,
        items: {
          create: createItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (discountCode && cartId) {
      const coupon = await prisma.couponCode.findUnique({
        where: { code: discountCode },
      });

      if (coupon) {
        const redemption = await prisma.couponRedemption.findUnique({
          where: {
            couponId_cartId: {
              couponId: coupon.id,
              cartId: cartId,
            },
          },
        });

        if (redemption && !redemption.orderId) {
          await prisma.couponRedemption.update({
            where: { id: redemption.id },
            data: {
              orderId: order.id,
            },
          });

          const updatedCount = coupon.redeemCount + 1;
          const stillVisible = updatedCount < coupon.maxRedeemCount;

          await prisma.couponCode.update({
            where: { id: coupon.id },
            data: {
              redeemCount: updatedCount,
              show_on_homepage: stillVisible,
            },
          });
        }
      }
    }

    // Send order confirmation email
    await sendOrderConfirmationEmail(
      order.user.email,
      order.user.profile?.firstName || 'Customer',
      `COM-${order.id}`,
      order.items.map((i) => ({
        name: i.variant?.name || i.product?.name || 'Product',
        quantity: i.quantity,
        price: i.price,
      })),
      finalAmount,
      order.payment?.method || 'N/A'
    );

    await sendNotification(userId, `🎉 Your order #${order.id} has been created and status ${order.status}. Final amount: ₹${finalAmount}`, 'ORDER');

    await sendOrderStatusUpdateEmail(order.user.email, order.user.profile?.firstName || 'Customer', order.id, order.status);

    res.status(201).json({ ...order, finalAmount });
  } catch (error) {
    console.error('Create order failed:', error);
    res.status(500).json({ message: 'Failed to create order', error });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await prisma.order.update({
    where: { id: Number(orderId) },
    data: { status },
    include: {
      user: true,
    },
  });

  await sendNotification(order.userId, `Your order #${order.id} status has been updated to ${order.status}. at ${dayjs().format('DD/MM/YYYY, hh:mmA')}`, 'ORDER');

  res.json(order);
};

// Get orders for admin
// export const getAllUserOrdersForAdmin = async (req: CustomRequest, res: Response) => {
//   const {
//     search,
//     page = 1,
//     page_size = 10,
//     ordering = 'desc',
//     order_status,
//     start_date,
//     end_date,
//   } = req.query;

//   const isAdmin = req.user?.role === 'ADMIN';

//   if (!isAdmin) {
//     res.status(403).json({ message: "Access denied. Only admins can view all orders." });
//     return
//   }

//   const pageNum = parseInt(page as string);
//   const pageSizeNum = parseInt(page_size as string);
//   const sortOrder = ordering === 'asc' ? 'asc' : 'desc';

//   try {
//     const whereConditions: any = {};

//     if (search) {
//       const searchStr = search.toString();
//       const orConditions: any[] = [];

//       if (!isNaN(Number(searchStr))) {
//         orConditions.push({ id: Number(searchStr) });
//       }

//       const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
//       if (validStatuses.includes(searchStr)) {
//         orConditions.push({ status: searchStr });
//       }

//       orConditions.push({
//         OR: [
//           {
//             user: {
//               OR: [
//                 { email: { contains: searchStr, mode: 'insensitive' } },
//                 {
//                   profile: {
//                     OR: [
//                       { firstName: { contains: searchStr, mode: 'insensitive' } },
//                       { lastName: { contains: searchStr, mode: 'insensitive' } },
//                     ],
//                   },
//                 },
//               ],
//             },
//           },
//           {
//             // guest orders: search by address fullName or phone (replace with your fields)
//             address: {
//               OR: [
//                 { fullName: { contains: searchStr, mode: 'insensitive' } },
//                 { phone: { contains: searchStr, mode: 'insensitive' } },
//               ],
//             },
//           },
//         ],
//       });

//       whereConditions.OR = orConditions;
//     }


//     if (order_status) {
//       whereConditions.status = order_status;
//     }

//     if (start_date && end_date) {
//       const startDate = new Date(start_date as string);
//       const endDate = new Date(end_date as string);

//       // Increment endDate by 1 day for exclusive upper bound
//       endDate.setDate(endDate.getDate() + 1);

//       whereConditions.createdAt = {
//         gte: startDate,
//         lt: endDate,
//       };
//     }

//     const totalCount = await prisma.order.count({ where: whereConditions });

//     const orders = await prisma.order.findMany({
//       where: whereConditions,
//       include: {
//         items: {
//           include: {
//             product: {
//               include: {
//                 images: true,
//                 category: true,
//               },
//             },
//             variant: {
//               include: {
//                 images: true,
//               },
//             },
//           },
//         },
//         payment: true,
//         address: true,
//         user: true, // include user details (optional, for admin view)
//       },
//       orderBy: { createdAt: sortOrder },
//       skip: (pageNum - 1) * pageSizeNum,
//       take: pageSizeNum,
//     });

//     res.json({
//       success: true,
//       result: orders,
//       pagination: {
//         total: totalCount,
//         current_page: pageNum,
//         page_size: pageSizeNum,
//         total_pages: Math.ceil(totalCount / pageSizeNum),
//       },
//     });
//   } catch (error) {
//     console.error('Admin fetch orders failed:', error);
//     res.status(500).json({ message: 'Failed to fetch admin orders', error });
//   }
// };

// Get orders for admin
export const getAllUserOrdersForAdmin = async (req: CustomRequest, res: Response) => {
  const {
    search,
    page = 1,
    page_size = 10,
    ordering = 'desc',
    order_status,
    start_date,
    end_date,
  } = req.query;

  const isAdmin = req.user?.role === 'ADMIN';

  if (!isAdmin) {
    res.status(403).json({ message: "Access denied. Only admins can view all orders." });
    return
  }

  const pageNum = parseInt(page as string);
  const pageSizeNum = parseInt(page_size as string);
  const sortOrder = ordering === 'asc' ? 'asc' : 'desc';

  try {
    const whereConditions: any = {};


    if (req.query.id) {
      const id = parseInt(req.query.id as string);
      if (!isNaN(id)) {
        whereConditions.id = id;
      }
    } else if (search) {
      const searchStr = search.toString();
      const orConditions: any[] = [];

      if (!isNaN(Number(searchStr))) {
        orConditions.push({ id: Number(searchStr) });
      }

      const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (validStatuses.includes(searchStr.toUpperCase())) {
        orConditions.push({ status: searchStr.toUpperCase() });
      }

      orConditions.push({
        OR: [
          {
            user: {
              OR: [
                { email: { contains: searchStr, mode: 'insensitive' } },
                {
                  profile: {
                    OR: [
                      { firstName: { contains: searchStr, mode: 'insensitive' } },
                      { lastName: { contains: searchStr, mode: 'insensitive' } },
                    ],
                  },
                },
              ],
            },
          },
          {
            address: {
              OR: [
                { fullName: { contains: searchStr, mode: 'insensitive' } },
                { phone: { contains: searchStr, mode: 'insensitive' } },
              ],
            },
          },
        ],
      });

      if (orConditions.length > 0) {
        whereConditions.OR = orConditions;
      }
    }

    if (order_status) {
      whereConditions.status = order_status;
    }

    if (start_date && end_date) {
      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);

      // Increment endDate by 1 day for exclusive upper bound
      endDate.setDate(endDate.getDate() + 1);

      whereConditions.createdAt = {
        gte: startDate,
        lt: endDate,
      };
    }

    const totalCount = await prisma.order.count({ where: whereConditions });

    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
              },
            },
            variant: {
              include: {
                images: true,
              },
            },
          },
        },
        payment: true,
        address: true,
        user: true, // include user details (optional, for admin view)
      },
      // Get orders for admin
      // export const getAllUserOrdersForAdmin = async (req: CustomRequest, res: Response) => {
      //   const {
      //     search,
      //     page = 1,
      //     page_size = 10,
      //     ordering = 'desc',
      //     order_status,
      //     start_date,
      //     end_date,
      //   } = req.query;

      //   const isAdmin = req.user?.role === 'ADMIN';

      //   if (!isAdmin) {
      //     res.status(403).json({ message: "Access denied. Only admins can view all orders." });
      //     return
      //   }

      //   const pageNum = parseInt(page as string);
      //   const pageSizeNum = parseInt(page_size as string);
      //   const sortOrder = ordering === 'asc' ? 'asc' : 'desc';

      //   try {
      //     const whereConditions: any = {};

      //     if (search) {
      //       const searchStr = search.toString();
      //       const orConditions: any[] = [];

      //       if (!isNaN(Number(searchStr))) {
      //         orConditions.push({ id: Number(searchStr) });
      //       }

      //       const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      //       if (validStatuses.includes(searchStr)) {
      //         orConditions.push({ status: searchStr });
      //       }

      //       orConditions.push({
      //         OR: [
      //           {
      //             user: {
      //               OR: [
      //                 { email: { contains: searchStr, mode: 'insensitive' } },
      //                 {
      //                   profile: {
      //                     OR: [
      //                       { firstName: { contains: searchStr, mode: 'insensitive' } },
      //                       { lastName: { contains: searchStr, mode: 'insensitive' } },
      //                     ],
      //                   },
      //                 },
      //               ],
      //             },
      //           },
      //           {
      //             // guest orders: search by address fullName or phone (replace with your fields)
      //             address: {
      //               OR: [
      //                 { fullName: { contains: searchStr, mode: 'insensitive' } },
      //                 { phone: { contains: searchStr, mode: 'insensitive' } },
      //               ],
      //             },
      //           },
      //         ],
      //       });

      //       whereConditions.OR = orConditions;
      //     }


      //     if (order_status) {
      //       whereConditions.status = order_status;
      //     }

      //     if (start_date && end_date) {
      //       const startDate = new Date(start_date as string);
      //       const endDate = new Date(end_date as string);

      //       // Increment endDate by 1 day for exclusive upper bound
      //       endDate.setDate(endDate.getDate() + 1);

      //       whereConditions.createdAt = {
      //         gte: startDate,
      //         lt: endDate,
      //       };
      //     }

      //     const totalCount = await prisma.order.count({ where: whereConditions });

      //     const orders = await prisma.order.findMany({
      //       where: whereConditions,
      //       include: {
      //         items: {
      //           include: {
      //             product: {
      //               include: {
      //                 images: true,
      //                 category: true,
      //               },
      //             },
      //             variant: {
      //               include: {
      //                 images: true,
      //               },
      //             },
      //           },
      //         },
      //         payment: true,
      //         address: true,
      //         user: true, // include user details (optional, for admin view)
      //       },
      //       orderBy: { createdAt: sortOrder },
      //       skip: (pageNum - 1) * pageSizeNum,
      //       take: pageSizeNum,
      //     });

      //     res.json({
      //       success: true,
      //       result: orders,
      //       pagination: {
      //         total: totalCount,
      //         current_page: pageNum,
      //         page_size: pageSizeNum,
      //         total_pages: Math.ceil(totalCount / pageSizeNum),
      //       },
      //     });
      //   } catch (error) {
      //     console.error('Admin fetch orders failed:', error);
      //     res.status(500).json({ message: 'Failed to fetch admin orders', error });
      //   }
      // };
      orderBy: { createdAt: sortOrder },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });

    res.json({
      success: true,
      result: orders,
      pagination: {
        total: totalCount,
        current_page: pageNum,
        page_size: pageSizeNum,
        total_pages: Math.ceil(totalCount / pageSizeNum),
      },
    });
  } catch (error) {
    console.error('Admin fetch orders failed:', error);
    res.status(500).json({ message: 'Failed to fetch admin orders', error });
  }
};


// Get a specific order by ID for the logged-in user
export const getOrderById = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: Number(id),
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
        address: true,
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('Fetch order by ID failed:', error);
    res.status(500).json({ message: 'Failed to fetch order', error });
  }
};

// Helper to format address safely
function formatAddress(address: any): string {
  if (!address) return 'N/A';

  return [
    address.addressLine,
    address.landmark,
    address.city,
    address.state,
    address.country || 'India',
    address.pincode,
  ]
    .filter(Boolean)
    .join(', ');
}

// GET single order info as JSON invoice response
export const getSingleOrder = async (req: CustomRequest, res: Response) => {
  try {
    const orderIdStr = req.params.id;

    const orderId = Number(orderIdStr);
    if (!orderIdStr || isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid or missing order ID' });
      return
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { category: true, images: true, } },
            variant: { include: { images: true } },
          },
        },
        user: { include: { profile: true } },
        address: true,
        payment: true,
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return
    }

    const finalAmount = order.finalAmount ?? (order.totalAmount - (order.discountAmount || 0));

    const customerNameFromAddress = order.address?.fullName || 'Guest';
    const customerFirstName = order.user.profile?.firstName || customerNameFromAddress?.split(' ')?.[0] || 'Guest';
    const customerLastName = order.user.profile?.lastName || customerNameFromAddress?.split(' ')?.slice(1).join(' ') || '';

    const invoiceResponse = {
      message: '',
      total_pages: 1,
      current_page: 1,
      page_size: 20,
      results: [
        {
          id: `COM-${order.id}-${customerFirstName}`,
          purchased_item_count: order.items.length,
          customer_info: {
            first_name: customerFirstName,
            last_name: customerLastName,
            country_code_for_phone_number: null,
            phone_number: order.address?.phone,
            email: order.user.email,
            billing_address: order.billingAddress,
            delivery_address: order.shippingAddress,
          },
         order_info: {
  sub_total: order.subtotal,
  tax_type: order.taxType || '',
  applied_tax_rate: order.appliedTaxRate || 0,
  tax_inclusive: order.isTaxInclusive,
  tax_amount: order.taxAmount || 0,
  discount: order.discountAmount || 0,
  discount_coupon_code: order.discountCode || '',
  total_before_discount: order.totalAmount,
   final_payable_amount: finalAmount,
  final_total: finalAmount, // fallback if finalAmount not stored

  order_status: order.status,
  invoice_url: `/order/invoice?id=COM-${order.id}-${customerFirstName}`,
  created_at_formatted: dayjs(order.createdAt).format('DD/MM/YYYY, hh:mmA'),
  created_at: dayjs(order.createdAt).format('DD MMMM YYYY, hh:mmA'),
},
          payment_info: {
            is_payment_done: order.payment?.status === 'SUCCESS',
            payment_transaction_id: order.payment?.transactionId || '',
            payment_type: order.payment?.method || 'N/A',
          },
          items: order.items.map((item) => {
            const productImage = item.product?.images?.[0]?.image || null;
            const variantImage = item.variant?.images?.[0]?.url || null;

            return {
              id: item.id,
              variant_id: item.variantId || null,
              name: item.variant?.name || item.product?.name || 'Unnamed Product',
              SKU: `SKU-${item.variantId || item.productId || item.id}`,
              unit_price: item.price,
              quantity: item.quantity,
              category: item.product?.category?.name || 'General',
              specification: item.variant?.name || '',
              image: variantImage || productImage || null, // ✅ Added image
            };
          }),
        },
      ],
    };

    res.status(200).json(invoiceResponse);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
// PDF invoice generator endpoint
export const generateInvoicePDF = async (req: Request, res: Response) => {
  try {
    const orderIdStr = req.query.id as string;

    if (!orderIdStr || !orderIdStr.includes('-')) {
      res.status(400).send('Invalid invoice ID format');
      return;
    }

    const parts = orderIdStr.split('-');
    const orderId = Number(parts[1]);

    if (isNaN(orderId)) {
      res.status(400).send('Invalid order ID');
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { include: { profile: true } },
        items: {
          include: {
            product: { include: { category: true } },
            variant: { include: { images: true } },
          },
        },
        address: true,
        payment: true,
      },
    });

    if (!order) {
      res.status(404).send('Order not found');
      return;
    }

    const subtotal = order.subtotal ?? order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discountAmount = order.discountAmount ?? 0;
    const finalAmount = subtotal - discountAmount;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.id}.pdf`);

    doc.pipe(res);

    // ====== COLORS & STYLES ======
    const primaryColor = '#007bff';
    const headerBgColor = '#e9ecef';
    const rowAltColor = '#f8f9fa';
    const labelFont = 'Helvetica-Bold';
    const valueFont = 'Helvetica';

    // ====== TITLE ======
    doc
      .fillColor(primaryColor)
      .font(labelFont)
      .fontSize(26)
      .text('INVOICE', { align: 'center' });

    // ====== CUSTOMER & ORDER INFO ======
    const sectionTop = 100;
    const leftX = 50;
    const rightX = 320;
    const lineSpacing = 18;

    // Helper
    const drawLabel = (label: string, value: string, x: number, y: number, maxWidth = 200) => {
      doc
        .font(labelFont)
        .fontSize(11)
        .fillColor('black')
        .text(label, x, y);
      doc
        .font(valueFont)
        .fontSize(11)
        .fillColor('black')
        .text(value || '-', x, y + 13, { width: maxWidth });
    };

    // Left column (Customer Info)
    let yLeft = sectionTop;
    drawLabel('Customer:', `${order.user.profile?.firstName || ''} ${order.user.profile?.lastName || ''}`, leftX, yLeft);
    yLeft += lineSpacing * 2;

    drawLabel('Email:', order.user.email, leftX, yLeft);
    yLeft += lineSpacing * 2;

    drawLabel('Phone:', order.address?.phone || '-', leftX, yLeft);
    yLeft += lineSpacing * 2;

    const address = formatAddress(order.address) || '-';
    doc
      .font(labelFont)
      .fontSize(11)
      .text('Address:', leftX, yLeft);
    doc
      .font(valueFont)
      .fontSize(11)
      .text(doc.heightOfString(address, { width: 220 }) > 30 ? address.slice(0, 100) + '...' : address, leftX, yLeft + 13, { width: 220 });
    yLeft += lineSpacing * 3;

    // Right column (Order Info)
    let yRight = sectionTop;
    const customerName = order.user.profile?.firstName?.trim() || 'USER';

    drawLabel('Invoice ID:', `COM-${order.id}-${customerName}`, rightX, yRight);
    yRight += lineSpacing * 2;

    drawLabel('Date:', new Date(order.createdAt).toLocaleString(), rightX, yRight);
    yRight += lineSpacing * 2;

    drawLabel('Payment Method:', order.payment?.method || 'N/A', rightX, yRight);
    yRight += lineSpacing * 2;

    drawLabel('Order Status:', order.status || '-', rightX, yRight);
    yRight += lineSpacing * 2;

    // ====== TABLE HEADER ======
    const tableTop = Math.max(yLeft, yRight) + 30;
    const tableLeft = 50;
    const tableWidth = 500;
    const rowHeight = 25;

    doc
      .rect(tableLeft, tableTop, tableWidth, rowHeight)
      .fill(headerBgColor);

    doc
      .fillColor(primaryColor)
      .font(labelFont)
      .fontSize(12)
      .text('Item', tableLeft + 10, tableTop + 7)
      .text('Qty', tableLeft + 230, tableTop + 7, { width: 40, align: 'right' })
      .text('Unit Price', tableLeft + 310, tableTop + 7, { width: 80, align: 'right' })
      .text('Total', tableLeft + 410, tableTop + 7, { width: 80, align: 'right' });

    // ====== TABLE ROWS ======
    let y = tableTop + rowHeight;
    doc.font(valueFont).fontSize(11);

    order.items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill(rowAltColor);
      }

      const name = item.variant?.name?.trim() || item.product?.name?.trim() || 'Unnamed Product';
      const qty = item.quantity;
      const unitPrice = item.price;
      const total = qty * unitPrice;

      doc
        .fillColor('black')
        .text(name, tableLeft + 10, y + 7, { width: 200, ellipsis: true })
        .text(qty.toString(), tableLeft + 230, y + 7, { width: 40, align: 'right' })
        .text(unitPrice.toFixed(2), tableLeft + 310, y + 7, { width: 80, align: 'right' })
        .text(total.toFixed(2), tableLeft + 410, y + 7, { width: 80, align: 'right' });

      y += rowHeight;
    });

    // Table border
    doc.strokeColor(primaryColor).lineWidth(1).rect(tableLeft, tableTop, tableWidth, y - tableTop).stroke();

    // ====== TOTALS ======
    y += 20;

    doc
      .font(labelFont)
      .fillColor('black')
      .text('Subtotal:', tableLeft + 310, y, { width: 80, align: 'right' })
      .text(subtotal.toFixed(2), tableLeft + 410, y, { width: 80, align: 'right' });

    if (discountAmount > 0) {
      y += 18;
      doc
        .fillColor('red')
        .text('Discount:', tableLeft + 310, y, { width: 80, align: 'right' })
        .text(discountAmount.toFixed(2), tableLeft + 410, y, { width: 80, align: 'right' });
    }

    y += 25;
    doc
      .font(labelFont)
      .fontSize(13)
      .fillColor(primaryColor)
      .text('Final Total:', tableLeft + 310, y, { width: 80, align: 'right' })
      .text(finalAmount.toFixed(2), tableLeft + 410, y, { width: 80, align: 'right' });

    // ====== FOOTER ======
    doc
      .fontSize(10)
      .fillColor('gray')
      .text('Thank you for your purchase!', tableLeft, 770, { align: 'center', width: tableWidth });

    doc.end();



  } catch (error) {
    console.error('Invoice PDF generation failed:', error);
    res.status(500).send('Failed to generate invoice PDF');
  }
};


export const getOrdersForAdmin = async (req: CustomRequest, res: Response) => {
  const {
    customer,
    page = 1,
    page_size = 10,
    ordering = 'desc',
    order_status,
    start_date,
    end_date,
  } = req.query;

  const isAdmin = req.user?.role === 'ADMIN';
  const userId = isAdmin && customer ? parseInt(customer as string) : req.user?.userId;

  if (!userId) {
    res.status(400).json({ message: "Missing or invalid user ID" });
    return
  }

  const pageNum = parseInt(page as string);
  const pageSizeNum = parseInt(page_size as string);
  const sortOrder = ordering === 'asc' ? 'asc' : 'desc';

  try {
    const whereConditions: any = { userId };

    if (order_status) {
      whereConditions.status = order_status;
    }

    if (start_date && end_date) {
      whereConditions.createdAt = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string),
      };
    }

    const totalCount = await prisma.order.count({ where: whereConditions });

    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
        address: true,
      },
      orderBy: { createdAt: sortOrder },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });

    res.json({
      success: true,
      result: orders,
      pagination: {
        total: totalCount,
        current_page: pageNum,
        page_size: pageSizeNum,
        total_pages: Math.ceil(totalCount / pageSizeNum),
      },
    });
  } catch (error) {
    console.error('Fetch orders failed:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error });
  }
};

// Get orders for logged in user
export const userOrderHistory = async (req: CustomRequest, res: Response) => {
  const {
    customer,
    page = 1,
    page_size = 10,
    ordering = 'desc',
    order_status,
    start_date,
    end_date,
  } = req.query;

  const isAdmin = req.user?.role === 'ADMIN';
  const userId = isAdmin && customer ? parseInt(customer as string) : req.user?.userId;

  if (!userId) {
    res.status(400).json({ message: "Missing or invalid user ID" });
    return
  }

  const pageNum = parseInt(page as string);
  const pageSizeNum = parseInt(page_size as string);
  const sortOrder = ordering === 'asc' ? 'asc' : 'desc';

  try {
    const whereConditions: any = { userId };

    if (order_status) {
      whereConditions.status = order_status;
    }

    if (start_date && end_date) {
      whereConditions.createdAt = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string),
      };
    }

    const totalCount = await prisma.order.count({ where: whereConditions });

    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
        address: true,
      },
      orderBy: { createdAt: sortOrder },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });

    res.json({
      success: true,
      result: orders,
      pagination: {
        total: totalCount,
        current_page: pageNum,
        page_size: pageSizeNum,
        total_pages: Math.ceil(totalCount / pageSizeNum),
      },
    });
  } catch (error) {
    console.error('Fetch orders failed:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error });
  }
};