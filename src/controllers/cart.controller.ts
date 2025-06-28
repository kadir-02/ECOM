// src/controllers/cart.controller.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

interface CustomRequest extends Request {
  user?: JwtPayload;
}

// GET /cart
export const getCart = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
          variant: { include: { images: true } },
        },
      },
    },
  });

  if (!cart) {
    res.json({ cart: null, discount: 0 });
    return
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const discountRule = await prisma.discountRule.findFirst({ orderBy: { createdAt: 'desc' } });

  const discount = discountRule && itemCount >= discountRule.minItems ? discountRule.percentage : 0;

  res.json({ cart, discount });
};

// POST /cart/add
export const addToCart = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return
  }

  const { productId, variantId, quantity } = req.body;
  if (!productId && !variantId){
    res.status(400).json({ message: 'ProductId or VariantId required' });
    return
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  if (variantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.isDeleted) {
      res.status(404).json({ message: 'Variant not found' });
      return
    }

    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, variantId } });
    const updatedOrNew = existing
      ? await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + (quantity ?? 1) } })
      : await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity: quantity ?? 1 } });

    res.json(updatedOrNew);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.isDeleted){
     res.status(404).json({ message: 'Product not found' });
     return
  }

  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } });
  const updatedOrNew = existing
    ? await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + (quantity ?? 1) } })
    : await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: quantity ?? 1 } });

  res.json(updatedOrNew);
};

// PUT /cart/update/:itemId
export const updateCartItem = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return
  }

  const { itemId } = req.params;
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    res.status(400).json({ message: 'Quantity must be at least 1' });
    return
  }

  const item = await prisma.cartItem.findUnique({ where: { id: +itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== userId) {
    res.status(404).json({ message: 'Item not found' });
    return
  }

  const updated = await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  res.json(updated);
};

// DELETE /cart/remove/:itemId
export const removeCartItem = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId){
    res.status(401).json({ message: 'Unauthorized' });
    return
  }

  const { itemId } = req.params;
  const item = await prisma.cartItem.findUnique({ where: { id: +itemId }, include: { cart: true } });

  if (!item || item.cart.userId !== userId) {
    res.status(404).json({ message: 'Item not found' });
    return
  }

  await prisma.cartItem.delete({ where: { id: item.id } });
  res.json({ message: 'Item removed' });
};

// DELETE /cart/clear
export const clearCart = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
     res.status(401).json({ message: 'Unauthorized' });
    return
  }
    
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    res.json({ message: 'Cart already empty' });
    return
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  res.json({ message: 'Cart cleared' });
};
