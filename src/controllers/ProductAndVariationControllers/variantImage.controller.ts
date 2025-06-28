import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { v2 as cloudinary } from 'cloudinary';

interface JwtPayload {
  userId: number;
  role: 'USER' | 'ADMIN';
}

export interface UpdateRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
}

export const createVariantImage = async (req: UpdateRequest, res: Response) => {
  const variantId = +req.body.variantId;

  if (!variantId || isNaN(variantId)) {
     res.status(400).json({ success: false, message: 'Invalid or missing variantId' });
     return
  }

  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
     res.status(400).json({ success: false, message: 'At least one image is required' });
     return
  }

  try {
    const uploadResults = await Promise.all(
      files.map((file) =>
        new Promise<{ url: string; public_id: string }>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'variant_images' },
            (error, result) => {
              if (error || !result) return reject(error);
              resolve({ url: result.secure_url, public_id: result.public_id });
            }
          ).end(file.buffer);
        })
      )
    );

    const created = await prisma.variantImage.createMany({
      data: uploadResults.map((result) => ({
        url: result.url,
        publicId: result.public_id,
        variantId,
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

export const updateVariantImage = async (req: UpdateRequest, res: Response) => {
  const id = +req.params.id;
  const variantId = req.body.variantId ? +req.body.variantId : undefined;

  try {
    const existing = await prisma.variantImage.findUnique({ where: { id } });
    if (!existing) {
       res.status(404).json({ success: false, message: 'Image not found' });
       return
    }

    let imageUrl = existing.url;
    let publicId = existing.publicId;

    if (req.file) {
      if (publicId) {
        await cloudinary.uploader.destroy(publicId).catch((err) => {
          console.warn('Failed to delete old image from Cloudinary:', err.message);
        });
      }

      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'variant_images' },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          }
        ).end(req.file!.buffer);
      });

      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const updated = await prisma.variantImage.update({
      where: { id },
      data: {
        url: imageUrl,
        publicId,
        ...(variantId ? { variantId } : {}),
      },
    });

    res.status(200).json({ success: true, message: 'Variant image updated', variantImage: updated });
  } catch (err) {
    console.error('Error updating image:', err);
    res.status(500).json({ success: false, message: 'Failed to update image' });
  }
};

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

export const getAllVariantImages = async (req: Request, res: Response) => {
  const variantId = Number(req.params.variantId);

  try {
    const images = await prisma.variantImage.findMany({
      where: variantId ? { variantId } : undefined,
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

export const getVariantImageById = async (req: Request, res: Response) => {
  const id = Number(req.params.variantId);

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
      orderBy: { createdAt: 'desc' },
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
