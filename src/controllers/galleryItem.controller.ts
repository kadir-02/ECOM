import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { uploadToCloudinary } from '../utils/uploadToCloudinary';

// Create gallery item
export const createGalleryItem = async (req: Request, res: Response) => {
  const { sequence_number, section, is_active } = req.body;

  if (!sequence_number || !req.file?.buffer) {
    res.status(400).json({
      success: false,
      message: 'sequence_number and image file are required',
    });
    return
  }

  try {
    const existingItem = await prisma.galleryItem.findFirst({
      where: { sequence_number },
    });

    if (existingItem) {
      res.status(400).json({
        success: false,
        message: 'This sequence number already exists',
      });
      return;
    }

    if (section) {
      const type = await prisma.galleryType.findUnique({
        where: { name: section },
      });
      if (!type) {
        res.status(400).json({
          success: false,
          message: 'Invalid section — GalleryType not found',
        });
        return
      }
    }

    const result = await uploadToCloudinary(req.file.buffer, 'gallery');

    const item = await prisma.galleryItem.create({
      data: {
        sequence_number,
        image: result.secure_url,
        is_active: is_active === 'true' || is_active === true,
        section: section || undefined,
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

// Get all gallery items
export const getAllGalleryItems = async (req: Request, res: Response) => {
  try {
    const { ordering, page = '1', page_size = '10', is_active } = req.query;

    // Parse pagination params
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(page_size as string, 10);

    if (isNaN(pageNumber) || isNaN(pageSize) || pageNumber < 1 || pageSize < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid page or page_size. Both must be positive integers.',
      });
      return;
    }

    // Ordering logic
    let orderBy: Record<string, 'asc' | 'desc'> = { sequence_number: 'asc' };
    if (ordering && typeof ordering === 'string') {
      const isDesc = ordering.startsWith('-');
      const field = isDesc ? ordering.slice(1) : ordering;

      const allowedFields = ['sequence_number', 'createdAt', 'updatedAt', 'section'];
      if (!allowedFields.includes(field)) {
        res.status(400).json({
          success: false,
          message: `Invalid ordering field: ${field}`,
        });
        return;
      }

      orderBy = { [field]: isDesc ? 'desc' : 'asc' };
    }

    // Parse is_active as boolean if present
    const isActiveParsed =
      typeof is_active === 'string'
        ? is_active.toLowerCase() === 'true'
          ? true
          : is_active.toLowerCase() === 'false'
            ? false
            : undefined
        : undefined;

    const skip = (pageNumber - 1) * pageSize;

    // Build where clause only if is_active is valid
    const whereClause: any = {};
    if (typeof isActiveParsed === 'boolean') {
      whereClause.is_active = isActiveParsed;
    }

    const [items, totalCount] = await Promise.all([
      prisma.galleryItem.findMany({
        include: { type: true },
        orderBy,
        where: Object.keys(whereClause).length ? whereClause : undefined,
        skip,
        take: pageSize,
      }),
      prisma.galleryItem.count({
        where: Object.keys(whereClause).length ? whereClause : undefined,
      }),
    ]);

    const formatted = items.map(item => ({
      id: item.id,
      sequence_number: item.sequence_number,
      image: item.image,
      is_active: item.is_active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      section: item.section || null,
    }));

    res.status(200).json({
      success: true,
      result: formatted,
      total: totalCount,
      page: pageNumber,
      page_size: pageSize,
      total_pages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// Update gallery item
export const updateGalleryItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.galleryItem.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ success: false, message: 'GalleryItem not found' });
    return
  }

  const { sequence_number, section, is_active } = req.body;
  let image = existing.image;

  try {
    if (req.file?.buffer) {
      const result = await uploadToCloudinary(req.file.buffer, 'gallery');
      image = result.secure_url;
    }

    // Validate section if provided
    if (section) {
      const type = await prisma.galleryType.findUnique({
        where: { name: section },
      });
      if (!type) {
        res.status(400).json({
          success: false,
          message: 'Invalid section — GalleryType not found',
        });
        return
      }
    }
const finalSection = section || existing.section;

if (sequence_number !== undefined) {
  const duplicate = await prisma.galleryItem.findFirst({
    where: {
      section: finalSection,
      sequence_number: String(sequence_number),
      NOT: { id },
    },
  });

  if (duplicate) {
     res.status(409).json({
      success: false,
      message: `Sequence number "${sequence_number}" already exists in section "${finalSection}".`,
    });
    return
  }
}

    const updated = await prisma.galleryItem.update({
      where: { id },
      data: {
        sequence_number: sequence_number ?? existing.sequence_number,
        image,
        is_active: is_active !== undefined ? (is_active === 'true' || is_active === true) : existing.is_active,
        section: section || existing.section,
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

// Delete gallery item
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
