// src/controllers/guest.controller.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { OrderStatus, PaymentStatus, AddressType } from '@prisma/client';
import Razorpay from 'razorpay';
import { sendOrderStatusUpdateEmail } from '../email/orderStatusMail';
import { sendOrderConfirmationEmail } from '../email/sendOrderConfirmationEmail';
import { profile } from 'console';

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY,
//   key_secret: process.env.RAZORPAY_SECRET,
// });

export const guestCheckout = async (req: Request, res: Response) => {
  const {
    email,
    address,
    items,
    totalAmount,
    paymentMethod,
    subtotal,
    taxType,
    taxAmount,
    appliedTaxRate,
    isTaxInclusive,
    shippingRate,
    billingAddress,
    shippingAddress,
  }: {
    email: string;
    address: {
      fullName: string;
      phone: string;
      pincode: string;
      state: string;
      city: string;
      addressLine: string;
      landmark?: string;
    };
    items: {
      productId?: number;
      variantId?: number;
      quantity: number;
      price: number;
    }[];
    totalAmount: number;
    paymentMethod: string;
    subtotal: number;
    taxType:string;
    taxAmount:number;
    appliedTaxRate:number;
    isTaxInclusive:boolean;
    shippingRate:number;
     billingAddress: string;
    shippingAddress: string;
  } = req.body;

  try {
    // Validate items
const createItems = await Promise.all(
  items.map(async (item, idx) => {
    const hasProduct = typeof item.productId === 'number';
    const hasVariant = typeof item.variantId === 'number';

    if (!hasProduct && !hasVariant) {
      throw new Error(`Item ${idx + 1}: Must have either productId or variantId.`);
    }

    if (hasProduct && hasVariant) {
      throw new Error(`Item ${idx + 1}: Cannot have both productId and variantId.`);
    }

    if (hasVariant) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId! },
        include: { product: true },
      });
      if (!variant) throw new Error(`Variant ID ${item.variantId} not found`);

      return {
        productId: null,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        // name: `${variant.product.name} - ${variant.name}`, // Optional if needed in response
      };
    }

    const product = await prisma.product.findUnique({
      where: { id: item.productId! },
    });
    if (!product) throw new Error(`Product ID ${item.productId} not found`);

    return {
      productId: item.productId,
      variantId: null,
      quantity: item.quantity,
      price: item.price,
      // name: product.name, // Optional if needed in response
    };
  })
);

    // Find or create guest user
    let guestUser = await prisma.user.findFirst({
      where: { email },
    });

    if (!guestUser) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
         res.status(400).json({
          message: "Email already registered. Please log in to place an order.",
        });
        return
      }

      guestUser = await prisma.user.create({
        data: { email, isGuest: true },
      });
    }

    // Save guest address
    const savedAddress = await prisma.address.create({
      data: {
        userId: guestUser.id,
        type: AddressType.SHIPPING,
        isDefault: true,
        ...address,
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        method: paymentMethod,
        status: PaymentStatus.PENDING,
      },
    });
    let razorpayOrderId: string | null = null;
   let razorpayKeyId: string | null = null;

if (paymentMethod.toUpperCase() === 'RAZORPAY') {
  const razorpayService = await prisma.paymentService.findFirst({
    where: {
      name: 'Razorpay',
      is_active: true,
    },
  });

 const keyId = razorpayService?.razorpay_key_id || process.env.RAZORPAY_KEY;
const keySecret = razorpayService?.razorpay_key_secret || process.env.RAZORPAY_SECRET;

if (!keyId || !keySecret) {
  res.status(500).json({ message: 'Razorpay credentials not configured in DB or ENV.' });
  return;
}
 razorpayKeyId = keyId;

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: "INR",
    receipt: `guest_order_${Date.now()}`,
  });
  razorpayOrderId = razorpayOrder.id;
}


    // Create the order with items
    const order = await prisma.order.create({
      data: {
        userId: guestUser.id,
        addressId: savedAddress.id,
        totalAmount,
          subtotal,
    taxType,
    taxAmount,
    appliedTaxRate,
    isTaxInclusive,
    shippingRate,
    billingAddress,
    shippingAddress,
        status: OrderStatus.PENDING,
        paymentId: payment.id,
        razorpayOrderId,
        items: {
          create: createItems,
        },
      },
      include: {
      
     items: {
      include: {
        product: true,
        variant: {
          include: {
            product: true, // this gives you variant name AND product name
          },
        },
      },
    },
    address: true,
    payment: true,
    user:{
      include:{
        profile:true
      }
    }
  },
    });
    

    // await sendOrderStatusUpdateEmail(req?.body?.email, order?.address?.fullName || 'Customer', order.id, order.status);
  
    const customerName =
  order.user.profile?.firstName && order.user.profile?.lastName
    ? `${order.user.profile.firstName} ${order.user.profile.lastName}`
    : order.address?.fullName || 'Customer';
  await sendOrderConfirmationEmail(
  order.user.email,
customerName,
  `COM-${order.id}`,
 order.items.map((i) => ({
  name: i.variant
    ? `${i.variant.product?.name || 'Product'} - ${i.variant.name}`
    : i.product?.name || 'Product',
  quantity: i.quantity,
  price: i.price,
})),
  totalAmount,
  order.payment?.method || 'N/A'
);

    res.status(201).json({ message: 'Guest order placed successfully', order ,razorpayOrderId,razorpayKeyId});

  } catch (error: any) {
    console.error('Guest checkout failed:', error);
    res.status(500).json({
      message: 'Guest checkout failed',
      error: error?.message || 'Unknown error',
    });
  }
};
