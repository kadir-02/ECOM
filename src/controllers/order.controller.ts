import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { CustomRequest } from '../middlewares/authenticate';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import PDFDocument from 'pdfkit';
import { sendOrderConfirmationEmail } from '../email/sendOrderConfirmationEmail';

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

    res.status(201).json({ ...order, finalAmount });
  } catch (error) {
    console.error('Create order failed:', error);
    res.status(500).json({ message: 'Failed to create order', error });
  }
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
            image: item.variant?.images[0]?.url || item.product?.imageUrl || '',
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

    const order = await prisma.order.findFirst({
      where: { id: orderId },
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
      res.status(404).send('Order not found');
      return;
    }

    // ✅ Fallback to calculated subtotal if null
    const subtotal = order.subtotal ?? order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discountAmount = order.discountAmount ?? 0;
    const finalAmount = subtotal - discountAmount;

    // PDF Setup
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.id}.pdf`);
    doc.pipe(res);

    const primaryColor = '#007bff';
    const headerBgColor = '#e9ecef';
    const rowAltColor = '#f8f9fa';

    // Header
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(26).text('INVOICE', 50, 140);
    doc.fillColor('black').font('Helvetica').fontSize(12);

    // Customer Info
    const infoY = 180;
    doc.text(`Invoice ID: COM-${order.id}-${order.user.profile?.firstName || ''}`, 50, infoY);
    doc.text(`Customer: ${order.user.profile?.firstName || ''} ${order.user.profile?.lastName || ''}`, 50, infoY + 15);
    doc.text(`Email: ${order.user.email}`, 50, infoY + 30);
    doc.text(`Phone: ${order.address.phone}`, 50, infoY + 45);
    doc.text(`Address: ${formatAddress(order.address)}`, 50, infoY + 60, { width: 500 });
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 50, infoY + 90);
    doc.text(`Payment Method: ${order.payment?.method || 'N/A'}`, 50, infoY + 105);
    doc.text(`Order Status: ${order.status}`, 50, infoY + 120);

    // Table Headers
    const tableTop = infoY + 160;
    const tableLeft = 50;
    const tableWidth = 500;
    const rowHeight = 25;

    doc.rect(tableLeft, tableTop, tableWidth, rowHeight).fill(headerBgColor);
    doc
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Item', tableLeft + 10, tableTop + 7)
      .text('Qty', tableLeft + 210, tableTop + 7, { width: 50, align: 'right' })
      .text('Unit Price', tableLeft + 270, tableTop + 7, { width: 100, align: 'right' })
      .text('Total', tableLeft + 380, tableTop + 7, { width: 100, align: 'right' });

    // Table Rows
    let y = tableTop + rowHeight;
    doc.font('Helvetica').fontSize(12);
    order.items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill(rowAltColor);
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
    doc.strokeColor(primaryColor).lineWidth(1).rect(tableLeft, tableTop, tableWidth, y - tableTop).stroke();

    // Subtotal
    y += 20;
    doc
      .font('Helvetica-Bold')
      .fillColor('black')
      .text('Subtotal:', tableLeft + 270, y, { width: 100, align: 'right' })
      .text(`₹${subtotal}`, tableLeft + 380, y, { width: 100, align: 'right' });

    // Discount
    if (discountAmount > 0) {
      y += 20;
      doc
        .fillColor('red')
        .text('Discount:', tableLeft + 270, y, { width: 100, align: 'right' })
        .text(`₹${Math.abs(discountAmount)}`, tableLeft + 380, y, { width: 100, align: 'right' });
    }

    // Grand Total
    y += 30;
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(primaryColor)
      .text(`Grand Total: ₹${finalAmount}`, tableLeft, y, { align: 'right', width: tableWidth });

    // Footer
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
