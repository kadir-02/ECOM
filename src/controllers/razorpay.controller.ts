// src/controllers/razorpayWebhookController.ts

import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma';

export const razorpayWebhookHandler = async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const signature = req.headers['x-razorpay-signature'] as string;

  const body = req.body.toString();

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('Invalid Razorpay webhook signature');
     res.status(400).json({ message: 'Invalid signature' });
     return
  }

  const event = JSON.parse(body);

  if (event.event === 'payment.captured') {
    const razorpayOrderId = event.payload.payment.entity.order_id;

    try {
      await prisma.order.updateMany({
        where: { razorpayOrderId },
        data: {
          isVisible: true,
          status: 'CONFIRMED', 
        },
      });

      console.log(`✅ Order updated after payment capture: ${razorpayOrderId}`);
    } catch (err) {
      console.error('🔴 Failed to update order:', err);
    }
  }

  res.status(200).json({ status: 'Webhook received' });
};
