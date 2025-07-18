// src/controllers/guest.controller.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { OrderStatus, PaymentStatus, AddressType } from '@prisma/client';
import Razorpay from 'razorpay';

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
  } = req.body;

  try {
    // Validate items
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
        status: OrderStatus.PENDING,
        paymentId: payment.id,
        razorpayOrderId,
        items: {
          create: createItems,
        },
      },
      include: {
        items: true,
        address: true,
        payment: true,
      },
    });

    res.status(201).json({ message: 'Guest order placed successfully', order ,razorpayOrderId,razorpayKeyId});

  } catch (error: any) {
    console.error('Guest checkout failed:', error);
    res.status(500).json({
      message: 'Guest checkout failed',
      error: error?.message || 'Unknown error',
    });
  }
};
