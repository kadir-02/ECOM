import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { uploadToCloudinary } from '../utils/uploadToCloudinary';

// Create gallery item
export const createGalleryItem = async (req: Request, res: Response) => {
  const { sequence_number, typeId, is_active } = req.body;
  if (!sequence_number || !req.file?.buffer) {
     res.status(400).json({ success: false, message: 'sequence_number and image file are required' });
     return
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer, 'gallery');
    const item = await prisma.galleryItem.create({
      data: {
        sequence_number,
        image: result.secure_url,
        is_active: is_active !== 'false',
        typeId: typeId ? Number(typeId) : undefined,
      },
    });
    res.status(201).json({ success: true, message: 'GalleryItem created', result: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all items
export const getAllGalleryItems = async (_req: Request, res: Response) => {
  const items = await prisma.galleryItem.findMany({
    include: { type: true },
    orderBy: { sequence_number: 'asc' },
  });
  res.json({ success: true, result: items });
};

// Update item
export const updateGalleryItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.galleryItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Not found' });
  }

  const { sequence_number, typeId, is_active } = req.body;
  let image = existing!.image;

  if (req.file?.buffer) {
    const result = await uploadToCloudinary(req.file.buffer, 'gallery');
    image = result.secure_url;
  }

  const updated = await prisma.galleryItem.update({
    where: { id },
    data: {
      sequence_number: sequence_number ?? existing!.sequence_number,
      image,
      is_active: is_active !== undefined ? is_active !== 'false' : existing!.is_active,
      typeId: typeId ? Number(typeId) : existing!.typeId,
    },
  });

  res.json({ success: true, message: 'GalleryItem updated', result: updated });
};

// Delete item
export const deleteGalleryItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.galleryItem.delete({ where: { id } });
  res.json({ success: true, message: 'GalleryItem deleted' });
};
