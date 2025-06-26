import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { uploadToCloudinary } from '../utils/uploadToCloudinary';

// CREATE CATEGORY
export const createCategory = async (req: Request, res: Response) => {
  const { name, sequence_number } = req.body;

  try {
    let imageUrl: string | undefined;
    let banner: string | undefined;
    let publicId: string | undefined;

    if (req.files && 'image' in req.files) {
      const imageFile = Array.isArray(req.files['image']) ? req.files['image'][0] : req.files['image'];
      const result = await uploadToCloudinary(imageFile.buffer, 'categories/image');
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    if (req.files && 'banner' in req.files) {
      const bannerFile = Array.isArray(req.files['banner']) ? req.files['banner'][0] : req.files['banner'];
      const result = await uploadToCloudinary(bannerFile.buffer, 'categories/banner');
      banner = result.secure_url;
    }

    const category = await prisma.category.create({
      data: {
        name,
        sequence_number: Number(sequence_number),
        imageUrl,
        banner,
        publicId,
      },
    });

    res.status(201).json({ success: true, message: 'Category created', category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Error creating category' });
  }
};

// GET ALL CATEGORIES
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isDeleted: false },
      include: { subcategories: true },
      orderBy: { sequence_number: 'asc' },
    });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving categories' });
  }
};

// GET CATEGORY BY ID
export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: { subcategories: true },
    });

    if (!category || category.isDeleted) {
       res.status(404).json({ success: false, message: 'Category not found' });
       return
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving category' });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, sequence_number,isDeleted } = req.body;

  try {
    const data: any = {};

    if (name) data.name = name;
    if(isDeleted) data.isDeleted=isDeleted;
    if (sequence_number) data.sequence_number = Number(sequence_number);

    if (req.files && 'image' in req.files) {
      const imageFile = Array.isArray(req.files['image']) ? req.files['image'][0] : req.files['image'];
      const result = await uploadToCloudinary(imageFile.buffer, 'categories/image');
      data.imageUrl = result.secure_url;
      data.publicId = result.public_id;
    }

    if (req.files && 'banner' in req.files) {
      const bannerFile = Array.isArray(req.files['banner']) ? req.files['banner'][0] : req.files['banner'];
      const result = await uploadToCloudinary(bannerFile.buffer, 'categories/banner');
      data.banner = result.secure_url;
    }

    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data,
    });

    res.status(200).json({ success: true, message: 'Category updated', category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
};

// HARD DELETE
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.category.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
};

// SOFT DELETE
export const softDeleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data: { isDeleted: true },
    });
    res.status(200).json({ success: true, message: 'Category soft deleted', category: updated });
  } catch (error) {
    console.error('Soft delete category error:', error);
    res.status(500).json({ success: false, message: 'Error soft deleting category' });
  }
};

// RESTORE
export const restoreCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const restored = await prisma.category.update({
      where: { id: Number(id) },
      data: { isDeleted: false },
    });
    res.status(200).json({ success: true, message: 'Category restored', category: restored });
  } catch (error) {
    console.error('Restore category error:', error);
    res.status(500).json({ success: false, message: 'Error restoring category' });
  }
};
