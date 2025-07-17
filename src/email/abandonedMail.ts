import { transporter } from './mail';

type AbandonedProduct = {
  name: string;
  quantity: number;
  discount: number; // percentage
};

export const sendAbandonedCartEmail = async (
  email: string,
  products: AbandonedProduct[]
) => {
  const productListHtml = products.map((p) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #eee;">${p.name}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center;">${p.quantity}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center;color:#388e3c;font-weight:bold;">
        ${p.discount}% OFF
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafafa;padding:32px;border-radius:8px;border:1px solid #eee;">
      <h2 style="color:#222;text-align:center;">🛒 Still thinking about it?</h2>
      <p style="font-size:16px;color:#444;text-align:center;">
        We've saved your cart and applied exclusive discounts just for you!
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr>
            <th style="padding:10px;border:1px solid #eee;">Product</th>
            <th style="padding:10px;border:1px solid #eee;">Qty</th>
            <th style="padding:10px;border:1px solid #eee;">Discount</th>
          </tr>
        </thead>
        <tbody>${productListHtml}</tbody>
      </table>
      <div style="text-align:center;margin-top:20px;">
        <p style="font-size:15px;">Complete your purchase now to claim these deals!</p>
      </div>
      <p style="font-size:13px;color:#555;text-align:center;margin-top:24px;">
        <strong>Note:</strong> Discounts apply only to these specific items and quantities.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: '"E-COM" <no-reply@ecom.com>',
    to: email,
    subject: `🔥 Your cart has special discounts waiting!`,
    html,
  });
};
