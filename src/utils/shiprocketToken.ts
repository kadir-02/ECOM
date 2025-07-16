import prisma from "../db/prisma";

export async function regenerateShiprocketToken() {
  const shippingService = await prisma.shippingService.findFirst({
    where: { name: 'Shiprocket', is_active: true },
  });

  if (!shippingService?.shiprocket_username || !shippingService?.shiprocket_password) {
    throw new Error('Shiprocket credentials are missing');
  }

  const authResponse = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: shippingService.shiprocket_username,
      password: shippingService.shiprocket_password,
    }),
  });

  const authData = await authResponse.json();
  if (!authData.token) {
    throw new Error('Failed to get Shiprocket token');
  }

  // Save new token
  await prisma.shippingService.update({
    where: { id: shippingService.id },
    data: { shiprocket_token: authData.token },
  });

  return authData.token;
}
