import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { CustomRequest } from '../middlewares/authenticate';



// Admin: Create coupon code
export const createCouponCode = async (req: Request, res: Response) => {
  const { name, discount, expiresAt, code, maxRedeemCount, show_on_homepage,is_active } = req.body;

  // Validate required fields
  if (!name || !discount || !expiresAt || !code || !maxRedeemCount) {
     res.status(400).json({
      message: 'Missing required fields: name, discount, expiresAt, code, maxRedeemCount',
    });
    return;
  }

  try {
    const newCode = await prisma.couponCode.create({
      data: {
        name,
        code,
        discount,
        expiresAt: new Date(expiresAt),
        maxRedeemCount,
        show_on_homepage: show_on_homepage === 'false'? false : !!(show_on_homepage?? true), 
        is_active: is_active === 'false' ? false : !!(is_active ?? true),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Coupon code created successfully',
      data: newCode,
    });
  } catch (error) {
    console.error('Create coupon code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Admin: Delete coupon code by ID
export const deleteCouponCode = async (req: Request, res: Response) => {
  const { id } = req.params;
  const couponId = Number(id);

  if (!id || Number.isNaN(couponId)) {
     res.status(400).json({ message: 'Invalid or missing coupon ID' });
     return
  }

  try {
    // Check if coupon exists before deleting
    const existingCoupon = await prisma.couponCode.findUnique({
      where: { id: couponId },
    });

    if (!existingCoupon) {
       res.status(404).json({ message: 'Coupon code not found' });
       return
    }

    // Delete the coupon
    await prisma.couponCode.delete({
      where: { id: couponId },
    });

    res.status(200).json({ success: true, message: 'Coupon code deleted successfully' });
  } catch (error) {
    console.error('Delete coupon code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Admin: Get all coupon codes (global)
export const getAllCouponCodes = async (req: Request, res: Response) => {
  try {
    const { is_active, ordering } = req.query;

    // Dynamic filters
    const whereClause: any = {
      code: {
        not: {
          startsWith: 'ABND-', // 👈 Exclude abandoned cart codes
        },
      },
    };

    if (is_active === "true") whereClause.is_active = true;
    else if (is_active === "false") whereClause.is_active = false;

    // Default orderBy
    let orderByClause: any = { createdAt: "desc" };

    if (ordering) {
      if (typeof ordering === "string") {
        if (ordering.startsWith("-")) {
          orderByClause = {
            [ordering.slice(1)]: "desc",
          };
        } else {
          orderByClause = {
            [ordering]: "asc",
          };
        }
      }
    }

    const codes = await prisma.couponCode.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
      orderBy: orderByClause,
    });

    const formatted = codes.map(code => ({
      ...code,
      redeemCount: code._count.redemptions,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get all coupon codes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// // Get coupon code by ID
// export const getCouponCodeById = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     const code = await prisma.couponCode.findUnique({
//       where: { id: Number(id) },
//       include: { user: true, cart: true },
//     });
//     if (!code) {
//         res.status(404).json({ message: 'Coupon code not found' });
//         return
//     }
//     res.status(200).json({ success: true, data: code });
//   } catch (error) {
//     console.error('Get coupon code error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

export const updateCouponCode = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    code,
    discount,
    expiresAt,
    maxRedeemCount,
    show_on_homepage,
    is_active,
  } = req.body;

  if (!id) {
     res.status(400).json('Coupon ID is required');
     return
  }

  try {
    const couponId = parseInt(id);

    const existing = await prisma.couponCode.findUnique({
      where: { id: couponId },
    });

    if (!existing) {
       res.status(404).json('Coupon not found');
       return
    }

    const updatedCoupon = await prisma.couponCode.update({
      where: { id: couponId },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(discount !== undefined && { discount }),
        ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
        ...(maxRedeemCount !== undefined && { maxRedeemCount }),
       ...(show_on_homepage !== undefined && { show_on_homepage: show_on_homepage == 'true' }),

       ...(is_active !== undefined && { is_active: is_active == 'true' }),

      },
    });

     res.status(200).json({"message":"coupon updated successfully",updatedCoupon});
     return

  } catch (error: any) {
    console.error('Update coupon error:', error);

    if (error.code === 'P2002') {
       res.status(409).json('Coupon code must be unique');
       return
    }

     res.status(500).json('Internal server error');
     
  }
};


// User: Get all active coupon codes (globally available)
export const getUserCouponCodes = async (req: Request, res: Response) => {
  try {
    const { cartId } = req.body;

    if (!cartId) {
       res.status(400).json({ success: false, message: "Cart ID is required." });
       return;
    }

    const activeCodes = await prisma.couponCode.findMany({
      where: {
        code: {
          not: {
            startsWith: 'ABND-',
          },
        },
        expiresAt: {
          gt: new Date(),
        },
        redeemCount: {
          lt: prisma.couponCode.fields.maxRedeemCount,
        },
        is_active: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({ success: true, data: activeCodes });
  } catch (error) {
    console.error('Get user coupon codes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// POST /user/coupons/redeem - Apply a coupon code to user's car

export const redeemCouponCode = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  const { code, cartId } = req.body;

  if (!code || !cartId) {
     res.status(400).json({ message: 'Missing code or cartId' });
     return
  }

  try {
    // 1. Validate Cart
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) {
       res.status(400).json({ message: 'Invalid cartId: Cart does not exist' });
       return
    }

    // 2. Find the coupon
    const coupon = await prisma.couponCode.findUnique({
      where: { code },
    });

    if (!coupon) {
       res.status(400).json({ message: 'Coupon code does not exist' });
       return
    }

    // 3. Check expiry and redemption limit
    const now = new Date();
    if (coupon.expiresAt < now) {
       res.status(400).json({ message: 'Coupon code has expired' });
       return
    }

    if (coupon.redeemCount >= coupon.maxRedeemCount) {
       res.status(400).json({ message: 'Coupon redemption limit reached' });
       return
    }

  // 4. Check if this cart already redeemed this coupon
const alreadyRedeemed = await prisma.couponRedemption.findUnique({
  where: {
    couponId_cartId: {
      couponId: coupon.id,
      cartId: cartId,
    },
  },
});

if (alreadyRedeemed) {
  if (alreadyRedeemed.orderId !== null) {
    // Coupon already used in an actual order
    return res.status(400).json({ message: 'This coupon is already used in a completed order' });
  } else {
    // Soft redemption exists (no order placed) — reuse it instead of re-inserting
    return res.status(200).json({
      success: true,
      message: 'Coupon code applied successfully.',
      data: {
        couponCode: coupon.code,
        discount: coupon.discount,
      },
    });
  }
}

// 5. Create the redemption entry (safe to do now)
await prisma.couponRedemption.create({
  data: {
    couponId: coupon.id,
    cartId: cartId,
  },
});


     res.status(200).json({
      success: true,
      message: 'Coupon code applied successfully.',
      data: {
        couponCode: coupon.code,
        discount: coupon.discount,
      },
    });

  } catch (error) {
    console.error('Redeem coupon error:', error);
     res.status(500).json({ message: 'Internal server error' });
     return
  }
};
