import { Request, Response } from 'express';
import prisma from '../db/prisma';
import cloudinary from '../upload/cloudinary';
import { Readable } from 'stream';

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });

    Readable.from(buffer).pipe(stream);
  });
};

// Create Subcategory
export const createSubcategory = async (req: Request, res: Response) => {
  const { name, categoryId, sequence_number } = req.body;

  if (!name || !categoryId || !sequence_number) {
    res.status(400).json({ message: 'Name, categoryId, and sequence_number are required' });
    return;
  }

  try {
    let imageUrl: string | undefined;
    let banner: string | undefined;
    let publicId: string | undefined;

    if (req.files && 'image' in req.files) {
      const imageFile = Array.isArray(req.files['image']) ? req.files['image'][0] : req.files['image'];
      const result = await uploadToCloudinary(imageFile.buffer, 'subcategories/image');
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    if (req.files && 'banner' in req.files) {
      const bannerFile = Array.isArray(req.files['banner']) ? req.files['banner'][0] : req.files['banner'];
      const result = await uploadToCloudinary(bannerFile.buffer, 'subcategories/banner');
      banner = result.secure_url;
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        sequence_number: Number(sequence_number),
        categoryId: parseInt(categoryId),
        imageUrl,
        banner,
        publicId,
      },
    });

    res.status(201).json(subcategory);
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ message: 'Error creating subcategory' });
  }
};


// Update Subcategory
export const updateSubcategory = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, categoryId, sequence_number } = req.body;

  try {
    const data: any = {
      name,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      sequence_number: sequence_number ? Number(sequence_number) : undefined,
    };

    if (req.files && 'image' in req.files) {
      const imageFile = Array.isArray(req.files['image']) ? req.files['image'][0] : req.files['image'];
      const result = await uploadToCloudinary(imageFile.buffer, 'subcategories/image');
      data.imageUrl = result.secure_url;
      data.publicId = result.public_id;
    }

    if (req.files && 'banner' in req.files) {
      const bannerFile = Array.isArray(req.files['banner']) ? req.files['banner'][0] : req.files['banner'];
      const result = await uploadToCloudinary(bannerFile.buffer, 'subcategories/banner');
      data.banner = result.secure_url;
    }

    const updated = await prisma.subcategory.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Subcategory not found' });
      return;
    }
    console.error('Error updating subcategory:', error);
    res.status(500).json({ message: 'Error updating subcategory' });
  }
};


// Get All Subcategories
export const getAllSubcategories = async (_req: Request, res: Response) => {
  try {
    const subcategories = await prisma.subcategory.findMany({
      where: { isDeleted: false },
      include: { category: true, products: true },
    });
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ message: 'Error fetching subcategories' });
  }
};

// Get Subcategory by ID (instead of slug)
export const getSubcategoryById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: { category: true, products: true },
    });

    if (!subcategory || subcategory.isDeleted) {
       res.status(404).json({ message: 'Subcategory not found' });
       return
    }

    res.json(subcategory);
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({ message: 'Error fetching subcategory' });
  }
};



// Delete Subcategory (Hard Delete)
export const deleteSubcategory = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    await prisma.subcategory.delete({ where: { id } });
    res.json({ message: 'Subcategory deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ message: 'Subcategory not found' });
       return
    }
    res.status(500).json({ message: 'Error deleting subcategory' });
  }
};

// Soft Delete Subcategory
export const softDeleteSubcategory = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const updated = await prisma.subcategory.update({
      where: { id },
      data: { isDeleted: true },
    });
    res.json({ message: 'Subcategory soft deleted', subcategory: updated });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ message: 'Subcategory not found' });
       return
    }
    res.status(500).json({ message: 'Error soft deleting subcategory' });
  }
};

// Restore Subcategory
export const restoreSubcategory = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const restored = await prisma.subcategory.update({
      where: { id },
      data: { isDeleted: false },
    });
    res.json({ message: 'Subcategory restored', subcategory: restored });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ message: 'Subcategory not found' });
       return
    }
    res.status(500).json({ message: 'Error restoring subcategory' });
  }
};
