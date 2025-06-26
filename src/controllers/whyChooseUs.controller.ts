import { Request, Response } from 'express';
import prisma from '../db/prisma';
import cloudinary from '../upload/cloudinary';

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

// 🔸 Create WhyChooseUsItem
export const createWhyChooseUsItem = async (req: Request, res: Response) => {
  const { sequenceNumber, heading, description, isActive } = req.body;

  if (!sequenceNumber || !heading || !description) {
    res.status(400).json({ message: 'sequenceNumber, heading, and description are required.' });
    return;
  }

  try {
    let image: string | undefined;

    if (req.file) {
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'whyChooseUsImages' },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result as CloudinaryUploadResult);
          }
        ).end(req.file?.buffer);
      });

      image = result.secure_url;
    }

    const newItem = await prisma.whyChooseUsItem.create({
      data: {
        sequence_number: sequenceNumber,
        heading,
        description,
        image,
        isActive: isActive === 'false' ? false : true, // handle stringified bool from form
      },
    });

    res.status(201).json({success:true,newItem});
  } catch (error) {
    console.error('Create WhyChooseUsItem error:', error);
    res.status(500).json({ message: 'Error creating item' });
  }
};

// 🔸 Update WhyChooseUsItem
export const updateWhyChooseUsItem = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { sequenceNumber, heading, description, isActive } = req.body;

  try {
    const existing = await prisma.whyChooseUsItem.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    let image = existing.image;

    if (req.file) {
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'whyChooseUsImages' },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result as CloudinaryUploadResult);
          }
        ).end(req.file?.buffer);
      });

      image = result.secure_url;
    }

    const updated = await prisma.whyChooseUsItem.update({
      where: { id },
      data: {
        sequence_number: sequenceNumber,
        heading,
        description,
        image,
        isActive: isActive === 'false' ? false : true,
      },
    });

    res.json({success:true,updated});
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Item not found' });
      return;
    }
    console.error('Update WhyChooseUsItem error:', error);
    res.status(500).json({ message: 'Error updating item' });
  }
};

// 🔸 Get all
export const getAllWhyChooseUsItems = async (_req: Request, res: Response) => {
  try {
    const items = await prisma.whyChooseUsItem.findMany({
      orderBy: { sequence_number: 'asc' },
    });
    res.json({success:true,items});
  } catch (error) {
    console.error('Get all WhyChooseUs items error:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
};

// 🔸 Get one
export const getWhyChooseUsItemById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const item = await prisma.whyChooseUsItem.findUnique({ where: { id } });

    if (!item) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    res.json({success:true,item});
  } catch (error) {
    console.error('Get WhyChooseUs item by id error:', error);
    res.status(500).json({ message: 'Error fetching item' });
  }
};

// 🔸 Delete
export const deleteWhyChooseUsItem = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const item = await prisma.whyChooseUsItem.findUnique({ where: { id } });

    if (!item) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    await prisma.whyChooseUsItem.delete({ where: { id } });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete WhyChooseUs item error:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
};
