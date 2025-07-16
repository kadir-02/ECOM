import { regenerateShiprocketToken } from "./shiprocketToken";

export function parseAddressString(addrStr: string) {
  const parts = addrStr.split(',').map(p => p.trim());
  return {
    street: parts[0] || '',
    city: parts[1] || '',
    state: parts[2] || '',
    pincode: parts[3] || '',
    phone: parts[4] || '',
  };
}


export async function createShiprocketShipment(order:any, address:any, token: string) {
  const shippingAddr = parseAddressString(order.shippingAddress);
  const billingAddr = parseAddressString(order.billingAddress);

  // Calculate shipment dimensions & weight dynamically
  let maxLength = 0;
  let maxBreadth = 0;
  let maxHeight = 0;
  let totalWeight = 0;

  for (const item of order.items) {
    // Prioritize variant dimensions if present, else product
    const productData = item.variant || item.product;
    if (!productData) continue;

    maxLength = Math.max(maxLength, productData.length || 0);
    maxBreadth = Math.max(maxBreadth, productData.breadth || 0);
    maxHeight = Math.max(maxHeight, productData.height || 0);
    totalWeight += (productData.weight || 0) * item.quantity;
  }

  // Fallback to minimum dimensions if none provided
  maxLength = maxLength || 10;
  maxBreadth = maxBreadth || 10;
  maxHeight = maxHeight || 10;
  totalWeight = totalWeight || 1;

  const shipmentPayload = {
    order_id: `COM-${order.id}`,
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: 'Primary',
    billing_customer_name: order.user.profile?.firstName || 'Customer',
    billing_address: billingAddr.street,
    billing_city: billingAddr.city,
    billing_pincode: billingAddr.pincode,
    billing_state: billingAddr.state,
    billing_country: 'India',
    billing_email: order.user.email,
    billing_phone: billingAddr.phone,
    shipping_is_billing: false,

    shipping_customer_name: order.user.profile?.firstName || 'Customer',
    shipping_address: shippingAddr.street,
    shipping_city: shippingAddr.city,
    shipping_pincode: shippingAddr.pincode,
    shipping_state: shippingAddr.state,
    shipping_country: 'India',
    shipping_phone: shippingAddr.phone,

    order_items: order.items.map((item: any) => ({
      name: item.variant?.name || item.product?.name || 'Product',
      sku: item.variant?.SKU || item.product?.SKU || 'SKU',
      units: item.quantity,
      selling_price: item.price,
    })),

    payment_method: order.payment?.method?.toLowerCase() === 'cod' ? 'COD' : 'Prepaid',
    sub_total: order.subtotal,
    length: maxLength,
    breadth: maxBreadth,
    height: maxHeight,
    weight: totalWeight,
  };

  const shipmentRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(shipmentPayload),
  });

  if (shipmentRes.status === 401) {
    // Token expired — regenerate and retry
    const newToken = await regenerateShiprocketToken();
    return await createShiprocketShipment(order, address, newToken); // retry
  }

  const shipmentData = await shipmentRes.json();

  if (!shipmentData || shipmentData.status_code === 400) {
    console.error('Shiprocket shipment creation failed:', shipmentData);
    return null;
  }

  return shipmentData;
}