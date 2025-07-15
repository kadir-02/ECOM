import prisma from '../db/prisma';
import { sendAbandonedCartEmail } from '../email/abandonedMail';
import { CronJob } from 'cron';
import { sendNotification } from '../utils/notification';
import { NotificationType } from '@prisma/client';

export async function sendAbandonedCartReminders() {
  try {
    // 1. Get active settings
    const activeSettings = await prisma.abandonedCartSetting.findMany({
      where: { is_active: true },
      orderBy: { hours_after_email_is_sent: 'asc' },
    });

    if (activeSettings.length === 0) return;

    for (const setting of activeSettings) {
      const thresholdDate = new Date(Date.now() - setting.hours_after_email_is_sent * 60 * 60 * 1000);

      // 2. Get abandoned carts (never reminded)
      const abandonedCarts = await prisma.cart.findMany({
        where: {
          updatedAt: { lt: thresholdDate },
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

        // 3. Check if a valid coupon already exists
        const existingCoupon = await prisma.couponCode.findFirst({
          where: {
            code: `ABND-${cart.id}`,
            is_active: true,
            expiresAt: { gt: new Date() },
          },
        });

        let coupon = existingCoupon;

        // 4. If not, create coupon
        if (!coupon) {
          const code = `ABND-${cart.id}`;
          const expiresAt = new Date(Date.now() + setting.hours_after_email_cart_is_emptied * 60 * 60 * 1000);

          coupon = await prisma.couponCode.create({
            data: {
              name: 'Abandoned Cart Coupon',
              code,
              discount: setting.discount_to_be_given_in_percent,
              expiresAt,
              is_active: true,
              redeemCount: 0,
              maxRedeemCount: 1,
              show_on_homepage: false,
            },
          });
        }

        // 5. Send email
        const products = cart.items.map(item => ({
          name: item.product?.name || item.variant?.name || 'Cart Item',
          discount: coupon!.discount,
        }));

        await sendAbandonedCartEmail(userEmail, products, coupon.code);

        // 6. Send in-app notification
        await sendNotification(
          userId,
          `🛒 Your cart is waiting! Use coupon ${coupon.code} for ${coupon.discount}% off.`,
          NotificationType.SYSTEM
        );

        // 7. Update reminder count
        await prisma.cart.update({
          where: { id: cart.id },
          data: {
            reminderCount: 1,
            lastReminderAt: new Date(),
          },
        });

        console.log(`✅ Reminder sent to ${userEmail} with coupon ${coupon.code}`);
      }
    }

    // 8. Clean up expired unused coupons
    await prisma.couponCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        is_active: true,
        maxRedeemCount: 1,
        redeemCount: 0,
        show_on_homepage: false,
        name: 'Abandoned Cart Coupon',
      },
    });

  } catch (error) {
    console.error('🚨 Abandoned cart reminder job failed:', error);
  }
}

// Run every 15 minutes
const job = new CronJob('*/15 * * * *', sendAbandonedCartReminders);
job.start();
