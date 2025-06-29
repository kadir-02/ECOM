import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { CustomRequest } from '../middlewares/authenticate';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import PDFDocument from 'pdfkit';
import { sendOrderConfirmationEmail } from '../email/sendOrderConfirmationEmail';
import { sendNotification } from '../utils/notification';

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
    discountCode = '',
  }: {
    items: OrderItemInput[];
    addressId: number;
    totalAmount: number;
    paymentMethod: string;
    discountAmount?: number;
    discountCode?: string;
  } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
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

    // Calculate final amount after discount (never below zero)
    const finalAmount = Math.max(totalAmount - discountAmount, 0);

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
    const order = await prisma.order.create({
      data: {
        userId,
        addressId,
        totalAmount,
        discountAmount,
        discountCode,
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

// Get orders for logged in user
export const getUserOrders = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
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
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Fetch orders failed:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error });
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
    const userId = req.user?.userId;
    const orderIdStr = req.params.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Validate orderId param as number
    const orderId = Number(orderIdStr);
    if (!orderIdStr || isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid or missing order ID' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: { include: { category: true } },
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
      return;
    }
    const finalAmount = order.totalAmount - (order.discountAmount || 0);

    const invoiceResponse = {
      message: '',
      total_pages: 1,
      current_page: 1,
      page_size: 20,
      results: [
        {
          id: `COM-${order.id}-${order.user.profile?.firstName || 'USER'}`,
          purchased_item_count: order.items.length,
          customer_info: {
            first_name: order.user.profile?.firstName || '',
            last_name: order.user.profile?.lastName || '',
            country_code_for_phone_number: null,
            phone_number: order.address.phone,
            email: order.user.email,
            billing_address: formatAddress(order.address),
            delivery_address: formatAddress(order.address),
          },
          order_info: {
            sub_total: order.totalAmount,
            discount: order.discountAmount || 0,
            discount_coupon_code: order.discountCode || '',
            final_total: finalAmount,
            order_status: order.status,
            invoice_url: `/order/invoice?id=COM-${order.id}-${order.user.profile?.firstName}`,
            created_at_formatted: dayjs(order.createdAt).format('DD/MM/YYYY, hh:mmA'),
            created_at: dayjs(order.createdAt).format('DD MMMM YYYY, hh:mmA'),
          },
          payment_info: {
            is_payment_done: order.payment?.status === 'SUCCESS',
            payment_transaction_id: order.payment?.transactionId || '',
            payment_type: order.payment?.method || 'N/A',
          },
          items: order.items.map((item) => ({
            id: item.id,
            variant_id: item.variantId || null,
            name: item.variant?.name || item.product?.name || 'Unnamed Product',
            SKU: `SKU-${item.variantId || item.productId || item.id}`,
            unit_price: item.price,
            quantity: item.quantity,
            category: item.product?.category?.name || 'General',
            specification: item.variant?.name || '',
          })),
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
export const generateInvoicePdf = async (orderId: number): Promise<Buffer> => {
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

  if (!order) throw new Error('Order not found');

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers: Uint8Array[] = [];
  doc.on('data', buffers.push.bind(buffers));

  const drawSectionHeader = (label: string) => {
    const y = doc.y;
    doc.rect(50, y, 500, 24).fill('#f0f8ff').stroke();

    doc.fillColor('#007ACC').font('Helvetica-Bold').fontSize(13).text(label, 55, y + 6);

    doc.moveDown();
    doc.fillColor('black');
  };

  // HEADER
  doc.fillColor('#333').fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });

  doc
    .fontSize(14)
    .font('Helvetica')
    .fillColor('#666')
    .text('Thank you for your purchase!', { align: 'center' })
    .moveDown(2);

  // CUSTOMER INFO
  drawSectionHeader('Customer Details');
  doc
    .fontSize(12)
    .text(`Invoice ID: COM-${order.id}-${order.user.profile?.firstName || ''}`)
    .text(`Name: ${order.user.profile?.firstName || ''} ${order.user.profile?.lastName || ''}`)
    .text(`Email: ${order.user.email}`)
    .text(`Phone: ${order.address?.phone || '-'}`)
    .text(`Address: ${formatAddress(order.address) || '-'}`)
    .text(`Date: ${new Date(order.createdAt).toLocaleString()}`)
    .text(`Payment Method: ${order.payment?.method || 'N/A'}`)
    .text(`Order Status: ${order.status || '-'}`)
    .moveDown();

  // TABLE HEADER
  const tableTop = doc.y;
  const tableLeft = 50;
  const tableWidth = 500;
  const rowHeight = 25;

  doc.rect(tableLeft, tableTop, tableWidth, rowHeight).fill('#e9ecef');

  doc
    .fillColor('#007bff')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Item', tableLeft + 10, tableTop + 7)
    .text('Qty', tableLeft + 210, tableTop + 7, { width: 50, align: 'right' })
    .text('Unit Price', tableLeft + 270, tableTop + 7, { width: 100, align: 'right' })
    .text('Total', tableLeft + 380, tableTop + 7, { width: 100, align: 'right' });

  // TABLE ROWS
  let y = tableTop + rowHeight;
  doc.font('Helvetica').fontSize(12);

  order.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#f8f9fa');
    }

    const name = item.variant?.name || item.product?.name || 'Unnamed Product';
    const qty = item.quantity;
    const unitPrice = item.price;
    const total = qty * unitPrice;

    doc
      .fillColor('black')
      .text(name, tableLeft + 10, y + 7)
      .text(qty.toString(), tableLeft + 210, y + 7, { width: 50, align: 'right' })
      .text(`₹${unitPrice}`, tableLeft + 270, y + 7, { width: 100, align: 'right' })
      .text(`₹${total}`, tableLeft + 380, y + 7, { width: 100, align: 'right' });

    y += rowHeight;
  });

  // Table Border
  doc.strokeColor('#007bff').lineWidth(1).rect(tableLeft, tableTop, tableWidth, y - tableTop).stroke();

  // Calculate totals
  const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = order.discountAmount ?? 0;
  const finalAmount = subtotal - discountAmount;

  y += 20;
  doc
    .font('Helvetica-Bold')
    .fillColor('black')
    .text('Subtotal:', tableLeft + 270, y, { width: 100, align: 'right' })
    .text(`₹${subtotal.toFixed(2)}`, tableLeft + 380, y, { width: 100, align: 'right' });

  if (discountAmount > 0) {
    y += 20;
    doc
      .fillColor('red')
      .text('Discount:', tableLeft + 270, y, { width: 100, align: 'right' })
      .text(`₹${Math.abs(discountAmount).toFixed(2)}`, tableLeft + 380, y, { width: 100, align: 'right' });
  }

  y += 30;
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#007bff')
    .text(`Grand Total: ₹${finalAmount.toFixed(2)}`, tableLeft, y, { align: 'right', width: tableWidth });

  // Footer
  doc
    .fontSize(10)
    .fillColor('gray')
    .text('Thank you for your purchase!', tableLeft, 770, { align: 'center', width: tableWidth });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
  });
};

export const getOrdersForAdmin = async (req: Request, res: Response) => {
  try {
    const {
      search,
      start_date,
      end_date,
      page = '1',
      page_size = '10',
      order_status,
      ordering,
    } = req.query;

    const currentPage = parseInt(page as string, 10);
    const pageSize = parseInt(page_size as string, 10);
    const skip = (currentPage - 1) * pageSize;

    const filters: Prisma.OrderWhereInput = {};

    // Filter by order status
    if (order_status) {
      filters.status = order_status as any;
    }

    // Filter by date range
   if (start_date && end_date) {
  const start = new Date(start_date as string);
  start.setHours(0, 0, 0, 0);

  const end = new Date(end_date as string);
  end.setHours(23, 59, 59, 999);

  filters.createdAt = {
    gte: start,
    lte: end,
  };
}

    // Search by order ID or general search term
    if (search) {
      const searchStr = search.toString();
      if (!isNaN(Number(searchStr))) {
        filters.id = Number(searchStr);
      } else {
        filters.OR = [
          { user: { email: { contains: searchStr, mode: 'insensitive' } } },
          { address: { fullName: { contains: searchStr, mode: 'insensitive' } } },
        ];
      }
    }

    // Handle ordering (e.g., ordering=-createdAt)
    let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' };
    if (ordering) {
      const field = ordering.toString().replace('-', '');
      const direction = ordering.toString().startsWith('-') ? 'desc' : 'asc';
      if (['createdAt', 'totalAmount', 'status'].includes(field)) {
        orderBy = { [field]: direction };
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: filters,
        include: {
          user: true,
          address: true,
          payment: true,
          items: {
            include: {
              product: {include:{images:true}},
              variant: {include:{images:true}},
            },
          },
        },
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.order.count({ where: filters }),
    ]);

    res.status(200).json({
      success:true,
      data: orders,
      pagination: {
        total,
        currentPage,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching orders for admin:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error });
  }
};