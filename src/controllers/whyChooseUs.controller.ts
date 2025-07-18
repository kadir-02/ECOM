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

    const sequenceStr = String(sequenceNumber); 

    const existing = await prisma.whyChooseUsItem.findFirst({
      where: { sequence_number: sequenceStr },
    });

    if (existing) {
      res.status(400).json({ message: 'Sequence number already used.' });
      return;
    }

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
        sequence_number: sequenceStr,
        heading,
        description,
        image,
        isActive: isActive === 'false' ? false : true,
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

    const sequenceStr = String(sequenceNumber);

    const duplicate = await prisma.whyChooseUsItem.findFirst({
      where: {
        sequence_number: sequenceStr,
        NOT: { id: id },
      },
    });

    if (duplicate) {
      res.status(400).json({ message: 'Sequence number already used by another item.' });
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
        sequence_number: sequenceStr,
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
export const getAllWhyChooseUsItems = async (req: Request, res: Response) => {
  try {
    const { ordering, is_active } = req.query;

    // Default ordering
    let orderBy: Record<string, 'asc' | 'desc'> = { sequence_number: 'asc' };

    if (ordering && typeof ordering === 'string') {
      const isDesc = ordering.startsWith('-');
      const field = isDesc ? ordering.slice(1) : ordering;

      const allowedFields = ['sequence_number', 'heading', 'isActive'];
      if (allowedFields.includes(field)) {
        orderBy = { [field]: isDesc ? 'desc' : 'asc' };
      } else {
        res.status(400).json({ success: false, message: `Invalid ordering field: ${field}` });
        return;
      }
    }

    // Optional filter for isActive
    const where: any = {};
    if (is_active !== undefined) {
      if (is_active === 'true') {
        where.isActive = true;
      } else if (is_active === 'false') {
        where.isActive = false;
      } else {
        res.status(400).json({ success: false, message: 'Invalid is_active value. Use true or false.' });
        return;
      }
    }

    const items = await prisma.whyChooseUsItem.findMany({ where, orderBy });

    const formattedItems = items.map(item => ({
      ...item,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.json({ success: true, items: formattedItems });
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

    res.json({
      success: true,
      item: {
        ...item,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
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
