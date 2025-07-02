import { transporter } from './mail';

export const sendNewsletterWelcomeEmail = async (email: string, name?: string) => {
  const customerName = name || 'Subscriber';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:32px;border-radius:8px;border:1px solid #ddd;">
      <h2 style="color:#1e88e5;text-align:center;">🎉 Welcome to the E-COM Newsletter!</h2>
      <p style="font-size:16px;color:#444;text-align:center;">Hi ${customerName},</p>
      <p style="font-size:15px;text-align:center;">
        Thanks for subscribing to our newsletter! You're now part of our exclusive list that gets first access to new products, offers, and beauty tips.
      </p>
      <div style="margin:20px 0;text-align:center;">
        <a href="https://readymadeui-nextjs-ecommerce-site-3.vercel.app/" style="background:#1e88e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">
          Visit Our Store
        </a>
      </div>
      <p style="font-size:13px;color:#888;text-align:center;margin-top:30px;">
        You can unsubscribe anytime, but we hope you'll stick around!
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: '"E-COM" <no-reply@ecom.com>',
    to: email,
    subject: '👋 Welcome to E-COM Newsletter',
    html,
  });
};