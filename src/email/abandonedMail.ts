import { transporter } from "./mail";

export const sendAbandonedCartEmail = async (
  email: string,
  products: { name: string | number; discount: number }[],
  discountCode: string
) => {
  const discount = products[0]?.discount ?? 0;

  const productList = products.map(p => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #eee;">${p.name}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center;color:#388e3c;font-weight:bold;">${p.discount}% OFF</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafafa;padding:32px;border-radius:8px;border:1px solid #eee;">
      <h2 style="color:#222;text-align:center;">🛒 You left something behind!</h2>
      <p style="font-size:16px;color:#444;text-align:center;">Complete your purchase with the same cart to receive your discount:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr>
            <th style="padding:10px;border:1px solid #eee;">Product</th>
            <th style="padding:10px;border:1px solid #eee;">Discount</th>
          </tr>
        </thead>
        <tbody>${productList}</tbody>
      </table>
      <div style="text-align:center;margin-top:20px;">
        <p style="font-size:16px;">Use this exclusive code at checkout:</p>
        <div style="font-size:24px;font-weight:bold;color:#d32f2f;background:#fff3e0;padding:10px 20px;display:inline-block;border-radius:6px;">
          ${discountCode}
        </div>
      </div>
      <p style="font-size:14px;color:#555;text-align:center;margin-top:24px;">
        <strong>Note:</strong> This coupon is valid only if you purchase the same products in the same quantities.
      </p>
      <p style="font-size:12px;color:#999;text-align:center;margin-top:20px;">This code will expire soon. Don’t miss out!</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"E-COM" <no-reply@ecom.com>',
    to: email,
    subject: `⏳ Finish your cart — now with ${discount}% OFF!`,
    html,
  });
};
