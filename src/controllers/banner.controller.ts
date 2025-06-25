import { Request, Response } from 'express';
import prisma from '../db/prisma';
import cloudinary from '../upload/cloudinary';
import { Readable } from 'stream';
import { MulterError } from 'multer';
import { uploadToCloudinary } from '../utils/uploadToCloudinary';


export const getBanners = async (req: Request, res: Response) => {
  try {
    const banners = await prisma.homepageBanner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
};


export const createBanner = async (req: Request, res: Response) => {
  try {
    const {
      heading,
      sequence_number,
      subheading,
      subheading2,
      buttonText,
      buttonLink,
    } = req.body;
    console.log(req.body)
    // Basic validation
    if (!heading || !sequence_number || !buttonText || !buttonLink) {
       res.status(400).json({
        error: 'Missing required fields: heading, sequence_number, buttonText, and buttonLink are required.',
      });
      return;
    }

    let imageUrl: string | undefined;
    let publicId: string | undefined;
    let mobileBanner: string | undefined;

    // Main image upload
    if (req.files && 'image' in req.files) {
      const mainFile = Array.isArray(req.files['image'])
        ? req.files['image'][0]
        : req.files['image'];

      if (mainFile?.buffer) {
        try {
          const result = await uploadToCloudinary(mainFile.buffer, 'banners');
          imageUrl = result.secure_url;
          publicId = result.public_id;
        } catch (err) {
           res.status(500).json({
            error: 'Failed to upload main banner image to Cloudinary.',
            details: (err as Error).message,
          });
        }
      }
    } else {
       res.status(400).json({
        error: 'Main banner image (field "image") is required.',
      });
    }

    // Optional mobile banner image
    if (req.files && 'mobile_banner' in req.files) {
      const mobileFile = Array.isArray(req.files['mobile_banner'])
        ? req.files['mobile_banner'][0]
        : req.files['mobile_banner'];

      if (mobileFile?.buffer) {
        try {
          const mobileResult = await uploadToCloudinary(mobileFile.buffer, 'banners/mobile');
          mobileBanner = mobileResult.secure_url;
        } catch (err) {
           res.status(500).json({
            error: 'Failed to upload mobile banner image to Cloudinary.',
            details: (err as Error).message,
          });
        }
      }
    }

    // Save to database
    const banner = await prisma.homepageBanner.create({
      data: {
        heading,
        sequence_number: Number(sequence_number),
        subheading,
        subheading2,
        buttonText,
        buttonLink,
        imageUrl,
        mobile_banner: mobileBanner,
        publicId,
      },
    });

    res.status(201).json({
      message: 'Banner created successfully.',
      banner,
    });
  } catch (error) {
    console.error('Error creating banner:', error);

    if (error instanceof MulterError) {
       res.status(400).json({
        error: 'File upload error',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal server error while creating banner.',
      details: (error as Error).message,
    });
  }
};

export const updateBanner = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const {
      heading,
      sequence_number,
      subheading,
      subheading2,
      buttonText,
      buttonLink,
    } = req.body;

    if (!heading || !sequence_number || !buttonText || !buttonLink) {
       res.status(400).json({
        error: 'Missing required fields: heading, sequence_number, buttonText, and buttonLink are required.',
      });
      return
    }

    let imageUrl: string | undefined;
    let publicId: string | undefined;
    let mobileBanner: string | undefined;

    // Main image (optional on update)
    if (req.files && 'image' in req.files) {
      const mainFile = Array.isArray(req.files['image'])
        ? req.files['image'][0]
        : req.files['image'];

      if (mainFile?.buffer) {
        try {
          const result = await uploadToCloudinary(mainFile.buffer, 'banners');
          imageUrl = result.secure_url;
          publicId = result.public_id;
        } catch (err) {
           res.status(500).json({
            error: 'Failed to upload main banner image to Cloudinary.',
            details: (err as Error).message,
          });
          return
        }
      }
    }

    // Mobile image (optional)
    if (req.files && 'mobile_banner' in req.files) {
      const mobileFile = Array.isArray(req.files['mobile_banner'])
        ? req.files['mobile_banner'][0]
        : req.files['mobile_banner'];

      if (mobileFile?.buffer) {
        try {
          const mobileResult = await uploadToCloudinary(mobileFile.buffer, 'banners/mobile');
          mobileBanner = mobileResult.secure_url;
        } catch (err) {
           res.status(500).json({
            error: 'Failed to upload mobile banner image to Cloudinary.',
            details: (err as Error).message,
          });
          return
        }
      }
    }

    const updateData: any = {
      heading,
      sequence_number: Number(sequence_number),
      subheading,
      subheading2,
      buttonText,
      buttonLink,
    };

    if (imageUrl) updateData.imageUrl = imageUrl;
    if (publicId) updateData.publicId = publicId;
    if (mobileBanner) updateData.mobile_banner = mobileBanner;

    const updated = await prisma.homepageBanner.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.status(200).json({
      message: 'Banner updated successfully.',
      banner: updated,
    });
  } catch (error) {
    console.error('Error updating banner:', error);

    if (error instanceof MulterError) {
       res.status(400).json({
        error: 'File upload error',
        details: error.message,
      });
      return
    }

    res.status(500).json({
      error: 'Internal server error while updating banner.',
      details: (error as Error).message,
    });
  }
};


export const deleteBanner = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.homepageBanner.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
};
