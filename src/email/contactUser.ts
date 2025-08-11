import { transporter } from "./mail";

export const sendContactConfirmationToUser = async (
  userEmail: string,
  userName: string
) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:24px;border-radius:8px;border:1px solid #ddd;">
      <h2 style="color:#1976d2;text-align:center;">📩 We’ve Received Your Message</h2>
      <p style="font-size:16px;color:#333;">Hi ${userName},</p>
      <p style="font-size:14px;color:#555;">Thank you for contacting us. We've received your message and will get back to you shortly.</p>
      <p style="font-size:12px;color:#999;margin-top:30px;">This is an automated confirmation. Our support team will be in touch soon.</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"Glam Support" <no-reply@ecom.com>',
    to: userEmail,
    subject: '📩 We’ve received your message',
    html,
  });
};
