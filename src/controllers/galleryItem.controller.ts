import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { uploadToCloudinary } from '../utils/uploadToCloudinary';

// 🔹 Create gallery item
export const createGalleryItem = async (req: Request, res: Response) => {
  const { sequence_number, typeName, is_active } = req.body;

  if (!sequence_number || !req.file?.buffer) {
     res.status(400).json({
      success: false,
      message: 'sequence_number and image file are required',
    });
    return
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, 'gallery');

    const item = await prisma.galleryItem.create({
      data: {
        sequence_number,
        image: result.secure_url,
        is_active: is_active === 'true' || is_active === true,
        typeName: typeName || undefined,
      },
    });

    res.status(201).json({
      success: true,
      message: 'GalleryItem created',
      result: item,
    });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 🔹 Get all gallery items
export const getAllGalleryItems = async (_req: Request, res: Response) => {
  try {
    const items = await prisma.galleryItem.findMany({
      include: { type: true },
      orderBy: { sequence_number: 'asc' },
    });

    const formatted = items.map(item => ({
      id: item.id,
      sequence_number: item.sequence_number,
      image: item.image,
      is_active: item.is_active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      typeName: item.type?.name || null,  // <- Add this line
    }));

    res.status(200).json({
      success: true,
      result: formatted,
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// 🔹 Update gallery item
export const updateGalleryItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.galleryItem.findUnique({ where: { id } });

  if (!existing) {
     res.status(404).json({ success: false, message: 'GalleryItem not found' });
     return
  }

  const { sequence_number, typeName, is_active } = req.body;
  let image = existing.image;

  try {
    if (req.file?.buffer) {
      const result = await uploadToCloudinary(req.file.buffer, 'gallery');
      image = result.secure_url;
    }

    const updated = await prisma.galleryItem.update({
      where: { id },
      data: {
        sequence_number: sequence_number ?? existing.sequence_number,
        image,
        is_active: is_active !== undefined ? (is_active === 'true' || is_active === true) : existing.is_active,
        typeName: typeName ?? existing.typeName,
      },
    });

    res.status(200).json({
      success: true,
      message: 'GalleryItem updated',
      result: updated,
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 🔹 Delete gallery item
export const deleteGalleryItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    await prisma.galleryItem.delete({ where: { id } });
    res.status(200).json({
      success: true,
      message: 'GalleryItem deleted',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
