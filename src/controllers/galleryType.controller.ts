import { Request, Response } from 'express';
import prisma from '../db/prisma';

// Create GalleryType
export const createGalleryType = async (req: Request, res: Response) => {
  const { name, isActive } = req.body;
  if (!name) {
     res.status(400).json({ success: false, message: 'name is required' });
     return
  }
  const type = await prisma.galleryType.create({
    data: { name, isActive: isActive !== 'false' },
  });
  res.status(201).json({ success: true, message: 'GalleryType created', result: type });
};

// Get all types
export const getAllGalleryTypes = async (_req: Request, res: Response) => {
  const types = await prisma.galleryType.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, result: types });
};

// Update type
export const updateGalleryType = async (req: Request, res: Response) => {
  const id = Number(req.params.id), { name, isActive } = req.body;
  const existing = await prisma.galleryType.findUnique({ where: { id } });
  if (!existing){
    res.status(404).json({ success: false, message: 'Not found' });
    return
  }
  const updated = await prisma.galleryType.update({
    where: { id },
    data: { name: name ?? existing.name, isActive: isActive !== undefined ? isActive !== 'false' : existing.isActive },
  });
  res.json({ success: true, message: 'GalleryType updated', result: updated });
};

// Delete type
export const deleteGalleryType = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.galleryType.delete({ where: { id } });
  res.json({ success: true, message: 'GalleryType deleted' });
};
