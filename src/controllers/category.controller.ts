import { Request, Response } from 'express';
import prisma from '../db/prisma';
import cloudinary from '../upload/cloudinary';

// Utility for uploading to Cloudinary
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
};

// Create Category
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

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating category' });
  }
};


// Get All Categories
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isDeleted: false },
      include: { subcategories: true },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving categories' });
  }
};

// Get Category By ID (instead of slug)
export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: { subcategories: true },
    });

    if (!category || category.isDeleted) {
       res.status(404).json({ message: 'Category not found' });
       return
    }

    res.json(category);
  } catch (error) {
    console.error('Error retrieving category by ID:', error);
    res.status(500).json({ message: 'Error retrieving category' });
  }
};

// Update Category
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, sequence_number } = req.body;

  try {
    const data: any = {
      name,
      sequence_number: sequence_number ? Number(sequence_number) : undefined,
    };

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

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating category' });
  }
};


// Hard Delete
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.category.delete({ where: { id: Number(id) } });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category' });
  }
};

// Soft Delete
export const softDeleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data: { isDeleted: true },
    });
    res.json({ message: 'Category soft deleted', category: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error soft deleting category' });
  }
};

// Restore Category
export const restoreCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const restored = await prisma.category.update({
      where: { id: Number(id) },
      data: { isDeleted: false },
    });
    res.json({ message: 'Category restored', category: restored });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error restoring category' });
  }
};
