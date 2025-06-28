import { Request, Response } from 'express';
import prisma from '../../db/prisma';

export const createProductSpecification = async (req: Request, res: Response) => {
  const { productId, name, value, isActive } = req.body;

  if (!productId || !name || !value) {
    res.status(400).json({ message: 'productId, name, and value are required' });
    return;
  }

  try {
    const created = await prisma.productSpecification.create({
      data: {
        productId: Number(productId),
        name,
        value,
        isActive: isActive ?? true,
        isDeleted: false
      },
    });
    res.status(201).json({ success: true, productSpecification: created });
  } catch (error) {
    res.status(500).json({ message: 'Error creating product specification' });
  }
};

export const getProductSpecifications = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  try {
    const specs = await prisma.productSpecification.findMany({
      where: { productId, isDeleted: false },
    });
    res.json({ success: true, specifications: specs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching specifications' });
  }
};

export const updateProductSpecification = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, value, isActive } = req.body;
  try {
    const updated = await prisma.productSpecification.update({
      where: { id },
      data: {
        name,
        value,
        isActive,
      },
    });
    res.json({ success: true, productSpecification: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product specification' });
  }
};

export const deleteProductSpecification = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.productSpecification.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    res.json({ success: true, message: 'Product specification soft deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product specification' });
  }
};
