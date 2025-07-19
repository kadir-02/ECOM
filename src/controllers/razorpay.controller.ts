import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma';

export const razorpayWebhookHandler = async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const signature = req.headers['x-razorpay-signature'] as string;

  const body = (req.body as Buffer).toString();

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  const isValid = signature === expectedSignature;
  console.log("signature", signature);
  console.log("expectedSignature", expectedSignature)
  console.log("body", body)

  let event: any;

  try {
    event = JSON.parse(body);
    console.log("event", event)
  } catch (err) {
    console.error('🔴 Failed to parse webhook body:', err);
    res.status(400).json({ message: 'Invalid body' });
    return;
  }

  const razorpayOrderId = event?.payload?.payment?.entity?.order_id || null;
  const razorpayPaymentId = event?.payload?.payment?.entity?.id || null; // ✅ Transaction ID

  console.log("razorpayOrderId", razorpayOrderId);
  console.log("razorpayPaymentId", razorpayPaymentId)

  // ✅ Log to database
  try {
    await prisma.razorpayWebhookLog.create({
      data: {
        event: event.event || 'unknown',
        orderId: razorpayOrderId,
        payload: event,
        receivedAt: new Date(),
        signature,
        isValid,
      },
    });
  } catch (logError) {
    console.error('🔴 Failed to log webhook:', logError);
  }

  // ❌ Invalid signature
  if (!isValid) {
    console.warn('❌ Invalid Razorpay webhook signature');
    res.status(400).json({ message: 'Invalid signature' });
    return
  }

  console.log("event.event", event.event, razorpayOrderId)

  // ✅ Handle valid webhook
  if (event.event === 'payment.captured' && razorpayOrderId) {
    try {
      const order = await prisma.order.update({
        where: { razorpayOrderId },
        data: {
          isVisible: true,
          status: 'CONFIRMED',
        },
      });
      console.log("order", order)
      if(!order) {
        res.status(400).json({error: "order payment not get"})
      }

      const paymentRes = await prisma.payment.updateMany({
        where: {
          id: Number(order.paymentId)
        },
        data: {
          transactionId: razorpayPaymentId,
          status: 'SUCCESS'
        }
      })

      console.log(`✅ Order updated after payment capture: ${razorpayOrderId} ${paymentRes}`);
    } catch (err) {
      console.error('🔴 Failed to update order:', err);
    }
  }

  res.status(200).json({ status: 'Webhook received' });
};
