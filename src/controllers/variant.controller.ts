import { Request, Response } from 'express';
import prisma from '../db/prisma';

export const createVariant = async (req: Request, res: Response) => {
  const { name, specification, price, stock, productId } = req.body;

  if (!name || !specification || price === undefined || stock === undefined || !productId) {
     res.status(400).json({ success: false, message: 'All fields are required' });
     return
  }

  const variant = await prisma.productVariant.create({
    data: {
      name,
      specification,
      price: parseFloat(price),
      stock: parseInt(stock),
      productId: parseInt(productId),
    },
  });

  res.status(201).json({ success: true, message: 'Variant created', variant });
};


export const getAllVariants = async (_req: Request, res: Response) => {
  try {
    const variants = await prisma.productVariant.findMany({
      where: { isDeleted: false },
      include: { product: true },
    });

    res.status(200).json({ success: true, message: 'Variants fetched', variants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching variants' });
  }
};

export const getVariantById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!variant) {
       res.status(404).json({ success: false, message: 'Variant not found' });
       return
    }

    res.status(200).json({ success: true, message: 'Variant found', variant });
  } catch {
    res.status(500).json({ success: false, message: 'Error fetching variant' });
  }
};

export const updateVariant = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, specification, price, stock } = req.body;

  try {
    const variant = await prisma.productVariant.update({
      where: { id },
      data: {
        name,
        specification,
        price: price !== undefined ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
      },
    });

    res.status(200).json({ success: true, message: 'Variant updated', variant });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ success: false, message: 'Variant not found' });
       return
    }
    res.status(500).json({ success: false, message: 'Error updating variant' });
  }
};

export const deleteVariant = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    await prisma.productVariant.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Variant permanently deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ success: false, message: 'Variant not found' });
       return
    }

    res.status(500).json({ success: false, message: 'Error deleting variant' });
  }
};

export const softDeleteVariant = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const variant = await prisma.productVariant.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.status(200).json({ success: true, message: 'Variant soft deleted', variant });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Variant not found' });
    } else {
      res.status(500).json({ success: false, message: 'Error soft deleting variant' });
    }
  }
};

export const restoreVariant = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const variant = await prisma.productVariant.update({
      where: { id },
      data: { isDeleted: false },
    });

    res.status(200).json({ success: true, message: 'Variant restored', variant });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Variant not found' });
    } else {
      res.status(500).json({ success: false, message: 'Error restoring variant' });
    }
  }
};
