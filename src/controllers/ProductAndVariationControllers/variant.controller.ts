import { Request, Response } from 'express';
import prisma from '../../db/prisma';

export const createVariant = async (req: Request, res: Response) => {
  const {
    name,
    description,
    specification,
    SKU,
    selling_price,
    base_and_selling_price_difference_in_percent,
    stock,
    colour_code,
    is_selected,
    is_active,
    is_new_arrival,
    created_by,
    low_stock_threshold,
    productId,
  } = req.body;

  if (
    !name ||
    !description ||
    !specification ||
    selling_price === undefined ||
    stock === undefined ||
    !productId
  ) {
    res.status(400).json({
      success: false,
      message: 'Required fields: name, description, specification, selling_price, stock, productId',
    });
    return;
  }

  try {
    const variant = await prisma.productVariant.create({
      data: {
        name,
        description,
        specification: typeof specification === 'string' ? JSON.parse(specification) : specification,
        SKU,
        selling_price: parseFloat(selling_price),
        base_and_selling_price_difference_in_percent:
          base_and_selling_price_difference_in_percent != null
            ? parseFloat(base_and_selling_price_difference_in_percent)
            : undefined,
        stock: parseInt(stock),
        colour_code,
        is_selected: is_selected === 'true' || is_selected === true,
        is_active: is_active === 'true' || is_active === true,
        is_new_arrival: is_new_arrival === 'true' || is_new_arrival === true,
        created_by: created_by ? parseInt(created_by) : 0,
        low_stock_threshold: low_stock_threshold ? parseInt(low_stock_threshold) : undefined,
        productId: parseInt(productId),
      },
    });

    res.status(201).json({ success: true, variant });
  } catch (error: any) {
    console.error('Error creating variant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVariant = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const {
    name,
    description,
    specification,
    SKU,
    selling_price,
    base_and_selling_price_difference_in_percent,
    stock,
    colour_code,
    is_selected,
    is_active,
    is_new_arrival,
    created_by,
    low_stock_threshold,
  } = req.body;

  try {
    const data: any = {
      name,
      description,
      specification: specification
        ? typeof specification === 'string'
          ? JSON.parse(specification)
          : specification
        : undefined,
      SKU,
      selling_price: selling_price != null ? parseFloat(selling_price) : undefined,
      base_and_selling_price_difference_in_percent:
        base_and_selling_price_difference_in_percent != null
          ? parseFloat(base_and_selling_price_difference_in_percent)
          : undefined,
      stock: stock != null ? parseInt(stock) : undefined,
      colour_code,
      is_selected: is_selected != null ? Boolean(is_selected) : undefined,
      is_active: is_active != null ? Boolean(is_active) : undefined,
      is_new_arrival: is_new_arrival != null ? Boolean(is_new_arrival) : undefined,
      created_by: created_by ? parseInt(created_by) : undefined,
      low_stock_threshold: low_stock_threshold ? parseInt(low_stock_threshold) : undefined,
    };

    const variant = await prisma.productVariant.update({
      where: { id },
      data,
    });

    res.json({ success: true, variant });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Variant not found' });
      return;
    }
    console.error('Error updating variant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllVariants = async (_req: Request, res: Response) => {
  try {
    const variants = await prisma.productVariant.findMany({
      where: { isDeleted: false },
      include: { product: true, images: true },
    });
    res.json({ success: true, variants });
  } catch (error: any) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVariantById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: true, images: true },
    });
    if (!variant){
       res.status(404).json({ success: false, message: 'Variant not found' });
       return
    }
    res.json({ success: true, variant });
  } catch (error: any) {
    console.error('Error fetching variant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVariant = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.productVariant.delete({ where: { id } });
    res.json({ success: true, message: 'Permanently deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ success: false, message: 'Variant not found' });
       return
    }
    console.error('Error deleting variant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const softDeleteVariant = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const variant = await prisma.productVariant.update({
      where: { id },
      data: { isDeleted: true },
    });
    res.json({ success: true, variant });
  } catch (error: any) {
    console.error('Error soft deleting variant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreVariant = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const variant = await prisma.productVariant.update({
      where: { id },
      data: { isDeleted: false },
    });
    res.json({ success: true, variant });
  } catch (error: any) {
    console.error('Error restoring variant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
