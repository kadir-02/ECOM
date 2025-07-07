import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { CustomRequest } from '../middlewares/authenticate';

const generateRandomCode = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Admin: Create coupon code
export const createCouponCode = async (req: Request, res: Response) => {
  const { name, discount, cartId, expiresAt } = req.body;

  if (!name || !discount || !expiresAt) {
    res.status(400).json({ message: 'Missing required fields: name, discount, expiresAt' });
    return;
  }

  try {
    let code: string;
    let exists = true;
    do {
      code = generateRandomCode();
      const existing = await prisma.couponCode.findUnique({ where: { code } });
      exists = !!existing;
    } while (exists);

    const newCode = await prisma.couponCode.create({
      data: {
        name,
        code,
        discount,
        cartId: cartId || null,
        expiresAt: new Date(expiresAt),
        userId: null,  // explicitly null to make it a global coupon
      },
    });

    res.status(201).json({ success: true, message: 'Coupon code created globally', data: newCode });
  } catch (error) {
    console.error('Create coupon code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Delete coupon code by ID
export const deleteCouponCode = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.couponCode.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true, message: 'Coupon code deleted' });
  } catch (error) {
    console.error('Delete coupon code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Get all coupon codes (global)
export const getAllCouponCodes = async (req: Request, res: Response) => {
  try {
    const codes = await prisma.couponCode.findMany({
    include: {
        user: {
        include: {
            profile: true,
        },
        },
        cart: true,
    },
    orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: codes });
  } catch (error) {
    console.error('Get all coupon codes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get coupon code by ID
export const getCouponCodeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const code = await prisma.couponCode.findUnique({
      where: { id: Number(id) },
      include: { user: true, cart: true },
    });
    if (!code) {
        res.status(404).json({ message: 'Coupon code not found' });
        return
    }
    res.status(200).json({ success: true, data: code });
  } catch (error) {
    console.error('Get coupon code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User: Get all active coupon codes (globally available)
export const getUserCouponCodes = async (req: CustomRequest, res: Response) => {
  try {
    const activeCodes = await prisma.couponCode.findMany({
    where: {
        used: false,
        expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: activeCodes });
  } catch (error) {
    console.error('Get user coupon codes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /user/coupons/redeem - Apply a coupon code to user's cart
export const redeemCouponCode = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  const { code, cartId } = req.body;

  if (!code || !cartId) {
     res.status(400).json({ message: 'Missing code or cartId' });
     return
  }

  try {
    // 1. Check if the cart exists
    const cartExists = await prisma.cart.findUnique({ where: { id: cartId } });
    if (!cartExists) {
       res.status(400).json({ message: 'Invalid cartId: Cart does not exist' });
       return
    }

    // 2. Remove any previous used coupon for the cart
    await prisma.couponCode.updateMany({
      where: { cartId, used: true },
      data: { cartId: null, used: false },
    });

    // 3. Find a valid coupon (not used, not expired, global or for this user)
    const coupon = await prisma.couponCode.findFirst({
      where: {
        code,
        used: false,
        expiresAt: { gt: new Date() },
        OR: [
          { userId: null },      // Global coupon
          { userId: userId },    // User-specific coupon
        ],
      },
    });

    // if (!coupon) {
    //    res.status(400).json({ message: 'Invalid or expired discount code' });
    //    return
    // }

    // 4. Apply the coupon (mark used, assign cart & user if needed)
    const updatedCoupon = await prisma.couponCode.update({
      where: { id: coupon?.id },
      data: {
        used: true,
        cartId,
        userId: coupon?.userId ?? userId,
      },
    });

     res.status(200).json({
      success: true,
      message: 'Coupon code applied successfully.',
      data: updatedCoupon,
    });

  } catch (error) {
    console.error('Redeem coupon error:', error);
     res.status(500).json({ message: 'Internal server error' });
  }
};