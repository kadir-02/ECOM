import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import { v2 as cloudinary } from 'cloudinary';

interface JwtPayload {
  userId: number;
  role: 'USER' | 'ADMIN';
}

export interface UpdateRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// CREATE
export const createVariantImage = async (req: Request, res: Response) => {
  const typedReq = req as UpdateRequest;
  const variantId = +typedReq.body.variantId;
  const sequenceNumber = typedReq.body.sequence_number ? +typedReq.body.sequence_number : undefined;
  const isActiveRaw = typedReq.body.is_active;
  const isActive = isActiveRaw === 'false' || isActiveRaw === false ? false : true;

  if (!variantId || isNaN(variantId)) {
     res.status(400).json({ success: false, message: 'Invalid or missing variantId' });
     return
  }

  const filesInput = typedReq.files;
  const files: Express.Multer.File[] = Array.isArray(filesInput) ? filesInput : [];

  if (!files || files.length === 0) {
     res.status(400).json({ success: false, message: 'At least one image is required' });
     return
  }

  try {
    const existingCount = await prisma.variantImage.count({ where: { variantId } });

    const uploadResults = await Promise.all(
      files.map((file, index) =>
        uploadToCloudinary(file.buffer, 'products/images')
          .then((result) => ({
            url: result.url,
            publicId: result.public_id,
            sequence_number: sequenceNumber !== undefined ? sequenceNumber + index : existingCount + index,
          }))
      )
    );

    const created = await prisma.variantImage.createMany({
      data: uploadResults.map((result) => ({
        url: result.url,
        publicId: result.publicId,
        variantId,
        sequence_number: result.sequence_number,
        is_active: isActive,
      })),
    });

    res.status(201).json({
      success: true,
      message: 'Images uploaded to Cloudinary',
      count: created.count,
    });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    res.status(500).json({ success: false, message: 'Failed to upload images' });
  }
};


export const updateVariantImage = async (req: Request, res: Response) => {
  const typedReq = req as UpdateRequest;
  const id = +typedReq.params.id;
  const variantId = typedReq.body.variantId ? +typedReq.body.variantId : undefined;

  try {
    const existing = await prisma.variantImage.findUnique({ where: { id } });

    if (!existing) {
       res.status(404).json({ success: false, message: 'Image not found' });
       return
    }

    let imageUrl = existing.url;
    let publicId = existing.publicId;

    // ✅ Handle new file upload
    if (typedReq.file) {
      // Delete old image from Cloudinary if exists
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err: any) {
          console.warn('Failed to delete old image from Cloudinary:', err.message);
        }
      }

      // Upload new image
      const result = await uploadToCloudinary(typedReq.file.buffer, 'products/images');
      imageUrl = result.url;
      publicId = result.public_id;
    }

    // ✅ Optional fields
    const updateData: any = {
      url: imageUrl,
      publicId,
    };

    if (variantId) updateData.variantId = variantId;
    if (typedReq.body.sequence_number !== undefined) {
      updateData.sequence_number = +typedReq.body.sequence_number;
    }
    if (typedReq.body.is_active !== undefined) {
      const isActiveRaw = typedReq.body.is_active;
      updateData.is_active = isActiveRaw === 'true' || isActiveRaw === true;
    }

    const updated = await prisma.variantImage.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Variant image updated successfully',
      variantImage: updated,
    });
  } catch (err) {
    console.error('Error updating variant image:', err);
    res.status(500).json({ success: false, message: 'Failed to update variant image' });
  }
};


// DELETE
export const deleteVariantImage = async (req: Request, res: Response) => {
  const id = +req.params.id;

  try {
    const image = await prisma.variantImage.findUnique({ where: { id } });

    if (!image) {
       res.status(404).json({ success: false, message: 'Image not found' });
       return
    }

    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId).catch((err) => {
        console.warn('Cloudinary deletion failed:', err.message);
      });
    }

    await prisma.variantImage.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Variant image deleted successfully' });
  } catch (err) {
    console.error('Error deleting variant image:', err);
    res.status(500).json({ success: false, message: 'Failed to delete variant image' });
  }
};

// GET ALL FOR VARIANT
export const getAllVariantImages = async (req: Request, res: Response) => {
  const variantId = Number(req.params.variantId);

  try {
    const images = await prisma.variantImage.findMany({
      where: variantId ? { variantId } : undefined,
      orderBy: { sequence_number: 'asc' },
      include: { variant: true },
    });

    res.status(200).json({
      success: true,
      message: 'Variant images fetched',
      images,
    });
  } catch (error) {
    console.error('Error fetching variant images:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch variant images' });
  }
};

// GET BY ID
export const getVariantImageById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
     res.status(400).json({ success: false, message: 'Invalid variant image id' });
     return
  }

  try {
    const image = await prisma.variantImage.findUnique({
      where: { id },
      include: { variant: true },
    });

    if (!image) {
       res.status(404).json({ success: false, message: 'Variant image not found' });
       return
    }

    res.status(200).json({
      success: true,
      message: 'Variant image found',
      variantImage: image,
    });
  } catch (error) {
    console.error('Error fetching variant image:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch variant image' });
  }
};

// GET ALL FOR PRODUCT + VARIANT
export const getAllVariantImagesForProduct = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  const variantId = Number(req.params.variantId);

  if (isNaN(productId) || isNaN(variantId)) {
     res.status(400).json({ success: false, message: 'Invalid productId or variantId' });
     return
  }

  try {
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        isDeleted: false,
        product: { isDeleted: false },
      },
      include: {
        product: true,
      },
    });

    if (!variant) {
       res.status(404).json({
        success: false,
        message: 'Variant not found for the specified product',
      });
      return
    }

    const images = await prisma.variantImage.findMany({
      where: { variantId },
      orderBy: { sequence_number: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Variant images for product fetched',
      productId,
      variantId,
      variantName: variant.name,
      imageCount: images.length,
      images,
    });
  } catch (error) {
    console.error('Error fetching variant images for product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
