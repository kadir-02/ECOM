import { transporter } from "./mail";

export const sendOrderStatusUpdateEmail = async (
  email: string,
  customerName: string,
  orderId: number,
  status: string
) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafafa;padding:32px;border-radius:8px;border:1px solid #eee;">
      <h2 style="color:#2e7d32;text-align:center;">📦 Order Update</h2>
      <p style="font-size:16px;color:#444;text-align:center;">Hi ${customerName},</p>
      <p style="font-size:14px;text-align:center;">Your order <strong>#${orderId}</strong> status has been updated to:</p>
      <p style="text-align:center;font-size:18px;font-weight:bold;color:#1976d2;">${status}</p>
      <p style="font-size:12px;color:#999;text-align:center;margin-top:30px;">Thank you for shopping with us!</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"E-COM" <no-reply@ecom.com>',
    to: email,
    subject: `📦 Order #${orderId} Status Update: ${status}`,
    html,
  });
};
