import { Request, Response } from 'express';
import prisma from '../db/prisma';

// 🔹 Create GalleryType
export const createGalleryType = async (req: Request, res: Response) => {
  const { name, isActive } = req.body;

  if (!name) {
     res.status(400).json({ success: false, message: 'Name is required' });
     return
  }

  try {
    const type = await prisma.galleryType.create({
      data: {
        name,
        isActive: isActive !== 'false',
      },
    });

    res.status(201).json({ success: true, message: 'GalleryType created', result: type });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating GalleryType' });
  }
};

// 🔹 Get All GalleryTypes
export const getAllGalleryTypes = async (_req: Request, res: Response) => {
  try {
    const types = await prisma.galleryType.findMany({
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, result: types });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching GalleryTypes' });
  }
};

// 🔹 Update GalleryType by name
export const updateGalleryType = async (req: Request, res: Response) => {
  const name = req.params.name;
  const { isActive, newName } = req.body;

  try {
    const existing = await prisma.galleryType.findUnique({ where: { name } });
    if (!existing) {
       res.status(404).json({ success: false, message: 'GalleryType not found' });
       return
    }

    const updated = await prisma.galleryType.update({
      where: { name },
      data: {
        name: newName ?? name,
        isActive: isActive !== undefined ? isActive !== 'false' : existing.isActive,
      },
    });

    res.status(200).json({ success: true, message: 'GalleryType updated', result: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating GalleryType' });
  }
};

// 🔹 Delete GalleryType by name
export const deleteGalleryType = async (req: Request, res: Response) => {
  const name = req.params.name;

  try {
    await prisma.galleryType.delete({ where: { name } });
    res.status(200).json({ success: true, message: 'GalleryType deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting GalleryType' });
  }
};
