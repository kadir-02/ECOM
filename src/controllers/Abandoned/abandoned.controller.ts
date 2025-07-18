import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const getAbandonedCartDiscount = async (req: Request, res: Response) => {
  const cartId = parseInt(req.query.cartId as string);

  if (!cartId) {
     res.status(400).json({ message: 'Cart ID is required in query params' });
     return;
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
       res.status(404).json({ message: 'Cart not found' });
       return;
    }

    const abandonedItems = await prisma.abandonedCartItem.findMany({
      where: {
        cartId: cart.id,
        userId: cart.userId,
      },
      include: {
        product: true,
        variant: true,
      },
    });

    if (abandonedItems.length === 0) {
       res.status(200).json({
        success: true,
        totalDiscount: 0,
        discountedItems: [],
        unmatchedItems: cart.items.map(item => ({
          name: item.product?.name || item.variant?.name || 'Item',
          quantity: item.quantity,
        })),
        message: 'No abandoned items found for this cart.',
      });
      return;
    }

    const discountedItems: any[] = [];
    const unmatchedItems: any[] = [];

    for (const cartItem of cart.items) {
      const match = abandonedItems.find((item:any) =>
        item.productId === cartItem.productId &&
        item.variantId === cartItem.variantId &&
        item.quantity === cartItem.quantity
      );

      if (match) {
        const rawPrice = cartItem.variant?.selling_price || cartItem.product?.sellingPrice || 0;
        const price = typeof rawPrice === 'object' && 'toNumber' in rawPrice
          ? rawPrice.toNumber()
          : Number(rawPrice);

        const discountAmount = (price * cartItem.quantity * match.discount) / 100;

        discountedItems.push({
          name: cartItem.product?.name || cartItem.variant?.name || 'Item',
          quantity: cartItem.quantity,
          price,
          discountPercent: match.discount,
          discountAmount,
        });
      } else {
        unmatchedItems.push({
          name: cartItem.product?.name || cartItem.variant?.name || 'Item',
          quantity: cartItem.quantity,
        });
      }
    }

    const totalDiscount = discountedItems.reduce((sum, item) => sum + item.discountAmount, 0);

     res.status(200).json({
      success: true,
      totalDiscount,
      discountedItems,
      unmatchedItems,
      message: unmatchedItems.length
        ? 'Partial discount available for some items.'
        : 'Full discount available.',
    });
    return;
  } catch (error) {
    console.error('❌ Error fetching abandoned cart discount:', error);
     res.status(500).json({ message: 'Internal server error' });
     return;
  }
};

export const applyAbandonedCartDiscount = async (req: Request, res: Response) => {
  const { cartId } = req.body;

  if (!cartId) {
    res.status(400).json({ message: 'Cart ID is required' });
    return;
  }

  try {
    // 1. Fetch cart with items, products, and variants
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    // 2. Fetch abandoned items for this user/cart
    const abandonedItems = await prisma.abandonedCartItem.findMany({
      where: {
        cartId: cart.id,
        userId: cart.userId!,
      },
      include: {
        product: true,
        variant: true,
      },
    });

    if (!abandonedItems.length) {
      res.status(400).json({ message: 'No abandoned cart items found' });
      return;
    }

    // 3. Calculate subtotal (all items)
    const subtotal = cart.items.reduce((sum, item) => {
      const rawPrice = item.variant?.selling_price ?? item.product?.sellingPrice ?? 0;
      const price = rawPrice instanceof Decimal ? rawPrice.toNumber() : Number(rawPrice);
      return sum + price * item.quantity;
    }, 0);

    // 4. Match abandoned items and calculate total discount
    const discountedItems: any[] = [];
    const unmatchedItems: any[] = [];
    let totalDiscount = 0;

    for (const cartItem of cart.items) {
      const match = abandonedItems.find(
        (item) =>
          item.productId === cartItem.productId &&
          item.variantId === cartItem.variantId &&
          item.quantity === cartItem.quantity
      );

      const rawPrice = cartItem.variant?.selling_price ?? cartItem.product?.sellingPrice ?? 0;
      const price = rawPrice instanceof Decimal ? rawPrice.toNumber() : Number(rawPrice);
      const quantity = cartItem.quantity;

      if (match) {
        const discountPercent = match.discount || 0;
        const discountAmount = (price * quantity * discountPercent) / 100;

        discountedItems.push({
          name: cartItem.product?.name || cartItem.variant?.name || 'Item',
          quantity,
          price,
          discountPercent,
          discountAmount,
        });

        totalDiscount += discountAmount;
      } else {
        unmatchedItems.push({
          name: cartItem.product?.name || cartItem.variant?.name || 'Item',
          quantity,
        });
      }
    }

    // 5. Calculate final total after discount
    const finalTotal = subtotal - totalDiscount;

    // 6. Update cart with discountedAbandonedTotal (optional, if you want to store discount)
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        discountedAbandonedTotal: Number(finalTotal),
      },
    });

    // 7. Return response with all pricing details
    res.status(200).json({
      success: true,
      message: unmatchedItems.length
        ? 'Partial discount applied. Some items do not qualify.'
        : 'Discount applied successfully.',
      subtotal,
      totalDiscount,
      finalTotal,
      discountedItems,
      unmatchedItems,
    });
  } catch (error) {
    console.error('❌ Error applying abandoned cart discount:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUsersSpecificAbandonedItems = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      res.json({ success: true, cart: { id: null, items: [] } });
      return;
    }

    // Get all abandoned items for this cart
    const abandonedItems = await prisma.abandonedCartItem.findMany({
      where: {
        userId,
        cartId: cart.id,
      },
      include: {
        product: {
          include: {
            images: true,
          },
        },
        variant: {
          include: {
            images: true,
            product: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Format items like your /cart endpoint
    const items = abandonedItems.map(item => ({
      id: item.productId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: item.product,
      variant: item.variant,
    }));

    res.json({
      success: true,
      cart: {
        id: cart.id,
        items: items,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching abandoned cart items:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};