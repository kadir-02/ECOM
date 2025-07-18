import { Request, Response } from "express";
import prisma from "../../db/prisma";

export const getAllAbandonedCartSettings = async (
  req: Request,
  res: Response
) => {
  try {
    const cartId = req.query.cartId;
    const userId = req.query.userId;

    const cartItems = await prisma.cart.findMany({
      where: {
        id: Number(cartId),
        userId: Number(userId)
      },
      include: {
        user: true,
        items: { include: { product: true, variant: true } },
      },
    });

    for (const cart of cartItems) {
      const userEmail = cart.user.email;
      const userId = cart.user.id;

      if (!userEmail || cart.items.length === 0) continue;

      const abandonedItems = await Promise.all(
        cart.items.map(async (item) => {
          return prisma.abandonedCartItem.create({
            data: {
              cartId: cart.id,
              userId,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              discount: 10,
            },
          });
        })
      );
      res.status(200).json({ status: true, response: abandonedItems });
    }
  } catch (error) {
    console.error("Failed to fetch abandoned cart settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
