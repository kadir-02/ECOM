import { Request, Response } from 'express';
import prisma from '../db/prisma';
import cloudinary from '../upload/cloudinary';
import { Readable } from 'stream';
import { MulterError } from 'multer';
import { uploadToCloudinary } from '../utils/uploadToCloudinary';


export const getBanners = async (req: Request, res: Response) => {
  try {
    const { ordering, isActive } = req.query;

    const orderFieldMap: Record<string, string> = {
      sequence_number: "sequence_number",
      createdAt: "createdAt",
      heading: "heading",
    };

    // 1. Handle ordering
    let orderBy: any = { createdAt: "desc" };
    if (ordering && typeof ordering === "string") {
      const isDesc = ordering.startsWith("-");
      const rawField = isDesc ? ordering.slice(1) : ordering;
      const mappedField = orderFieldMap[rawField];

      if (mappedField) {
        orderBy = { [mappedField]: isDesc ? "desc" : "asc" };
      } else {
         res.status(400).json({ error: `Invalid ordering field: ${rawField}` });
         return
      }
    }

    // 2. Handle filtering (e.g. isActive)
    const where: any = {};
    if (isActive !== undefined) {
      if (isActive === 'true' || isActive === 'false') {
        where.isActive = isActive === 'true';
      } else {
         res.status(400).json({ error: `'isActive' must be 'true' or 'false'` });
         return
      }
    }

    // 3. Query the DB with filters and ordering
    const banners = await prisma.homepageBanner.findMany({
      where,
      orderBy,
    });

    // 4. Format result
    const formatted = banners.map((banner) => ({
      ...banner,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt ? banner.updatedAt : null,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch banners" });
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
      isActive
    } = req.body;
    console.log(req.body)
    // Basic validation
    if (!heading || !sequence_number || !buttonText || !buttonLink) {
       res.status(400).json({
        error: 'Missing required fields: heading, sequence_number, buttonText, and buttonLink are required.',
      });
      return;
    }

    const existing = await prisma.homepageBanner.findFirst({
      where: {
        sequence_number: Number(sequence_number),
      },
    });

    if (existing) {
       res.status(400).json({
        error: `A banner with this sequence_number already exists.`,
      });
      return
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
        isActive:isActive=== 'true' || isActive === true,
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
      isActive
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
      isActive: isActive === 'true' || isActive === true,
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
