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
       return
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
      return
    }

    // 3. Match and calculate
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

    // 4. Update cart with discountedAbandonedTotal
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        discountedAbandonedTotal: Number(totalDiscount),
      },
    });

    // 5. Return response
     res.status(200).json({
      success: true,
      message: unmatchedItems.length
        ? 'Partial discount applied. Some items do not qualify.'
        : 'Discount applied successfully.',
      totalDiscount,
      discountedItems,
      unmatchedItems,
    });
    return;
  } catch (error) {
    console.error('❌ Error applying abandoned cart discount:', error);
     res.status(500).json({ message: 'Internal server error' });
     return
  }
};
