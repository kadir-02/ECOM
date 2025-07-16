import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma';

export const razorpayWebhookHandler = async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const signature = req.headers['x-razorpay-signature'] as string;

  const body = (req.body as Buffer).toString(); // ✅ Raw body

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

    console.log("expectedSignature", expectedSignature)
    console.log("signature", signature)

  if (signature !== expectedSignature) {
    console.warn('Invalid Razorpay webhook signature');
    res.status(400).json({ message: 'Invalid signature' });
    return;
  }

  const event = JSON.parse(body);

  console.log("event.event", event.event);
  console.log("req.body", req.body)

  if (event.event === 'payment.captured') {
    const razorpayOrderId = event.payload.payment.entity.order_id;

    try {
      const res = await prisma.order.updateMany({
        where: { razorpayOrderId },
        data: {
          isVisible: true,
          status: 'CONFIRMED',
        },
      });

      console.log(`✅ Order updated after payment capture: ${razorpayOrderId}`);
      console.log("res", res)
    } catch (err) {
      console.error('🔴 Failed to update order:', err);
    }
  }

  res.status(200).json({ status: 'Webhook received' });
};
