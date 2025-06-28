// src/controllers/productImage.controller.ts
import { Request, Response } from 'express';
import prisma from '../../db/prisma';

export const createProductImage = async (req: Request, res: Response) => {
  const { productId, image, sequence } = req.body;

  if (!productId || !image) {
     res.status(400).json({ message: 'productId and image are required' });
     return
  }

  try {
    const created = await prisma.productImage.create({
      data: {
        productId: Number(productId),
        image,
        sequence: sequence ? Number(sequence) : 0,
      },
    });

    res.status(201).json({ success: true, productImage: created });
  } catch (error) {
    res.status(500).json({ message: 'Error creating product image' });
  }
};

export const deleteProductImage = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.productImage.delete({ where: { id } });
    res.json({ success: true, message: 'Product image deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product image' });
  }
};
