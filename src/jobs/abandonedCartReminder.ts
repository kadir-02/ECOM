import prisma from '../db/prisma';
import { sendAbandonedCartEmail } from '../email/abandonedMail';
import { CronJob } from 'cron';
import { sendNotification } from '../utils/notification';
import { NotificationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library'; // Ensure this import

export async function sendAbandonedCartReminders() {
  try {
    const setting = await prisma.abandonedCartSetting.findFirst({
      where: { is_active: true },
    });

    if (!setting) return;

    const reminderThreshold = new Date(Date.now() - setting.hours_after_email_is_sent * 60 * 60 * 1000);

    // 🔔 Step 1: Send abandoned cart reminders
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lt: reminderThreshold },
        reminderCount: 0,
        items: { some: {} },
        user: { isGuest: false },
      },
      include: {
        user: true,
        items: { include: { product: true, variant: true } },
      },
    });

    for (const cart of abandonedCarts) {
      const userEmail = cart.user.email;
      const userId = cart.user.id;

      if (!userEmail || cart.items.length === 0) continue;

      let totalDiscountedValue = 0;

      const abandonedItems = await Promise.all(
        cart.items.map(async (item) => {
          const rawPrice = item.variant?.selling_price ?? item.product?.sellingPrice ?? 0;
          const price: number = rawPrice instanceof Decimal ? rawPrice.toNumber() : rawPrice;

          const discounted = price * item.quantity * (setting.discount_to_be_given_in_percent / 100);
          totalDiscountedValue += discounted;

          return prisma.abandonedCartItem.create({
            data: {
              cartId: cart.id,
              userId,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              discount: setting.discount_to_be_given_in_percent,
            },
          });
        })
      );

      const products = abandonedItems.map(ai => {
        const match = cart.items.find(i =>
          i.productId === ai.productId && i.variantId === ai.variantId
        );

        return {
          name: match?.product?.name || match?.variant?.name || 'Cart Item',
          quantity: ai.quantity,
          discount: ai.discount,
        };
      });

      await sendAbandonedCartEmail(userEmail, products);

      await sendNotification(
        userId,
        `🛒 Your cart is waiting! Enjoy ${setting.discount_to_be_given_in_percent}% off on your items!`,
        NotificationType.SYSTEM
      );

      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          reminderCount: 1,
          lastReminderAt: new Date(),
          discountedAbandonedTotal: totalDiscountedValue,
        },
      });

      console.log(`✅ Reminder sent to ${userEmail}`);
    }

    // 🧹 Step 2: Clear expired carts and reset
    const expireThreshold = new Date(Date.now() - setting.hours_after_email_cart_is_emptied * 60 * 60 * 1000);

    const expiredCarts = await prisma.cart.findMany({
      where: {
        lastReminderAt: { lt: expireThreshold },
        reminderCount: 1,
      },
    });

    for (const cart of expiredCarts) {
      await prisma.abandonedCartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          reminderCount: 0,
          lastReminderAt: null,
          discountedAbandonedTotal: null,
          updatedAt: new Date(),
        },
      });

      console.log(`🧹 Cleared cart ID ${cart.id}, removed all items and reset reminder state`);
    }
  } catch (error) {
    console.error('🚨 Abandoned cart reminder job failed:', error);
  }
}

const job = new CronJob('*/15 * * * *', sendAbandonedCartReminders);
job.start();
