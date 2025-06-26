import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

// 🔹 Create Testimonial
export const createTestimonial = async (req: Request, res: Response) => {
  const { name, description, role, is_active } = req.body;

  if (!name || !description || !role) {
     res.status(400).json({
      success: false,
      message: 'Name, description, and role are required.',
    });
    return;
  }

  try {
    let image = '';

    if (req.file?.buffer) {
      const result = await uploadToCloudinary(req.file.buffer, 'testimonials');
      image = result.secure_url;
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        description,
        role,
        image,
        is_active: is_active === 'false' ? false : true,
      },
    });

     res.status(201).json({
      success: true,
      message: 'Testimonial created successfully',
      testimonial,
    });
  } catch (error) {
    console.error('Create error:', error);
     res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// 🔹 Get All Testimonials
export const getAllTestimonials = async (_req: Request, res: Response) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
    });

     res.status(200).json({
      success: true,
      testimonials,
    });
  } catch (error) {
    console.error('Fetch error:', error);
     res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// 🔹 Get Testimonial By ID
export const getTestimonialById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const testimonial = await prisma.testimonial.findUnique({ where: { id } });

    if (!testimonial) {
       res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
      return;
    }

     res.status(200).json({
      success: true,
      testimonial,
    });
  } catch (error) {
    console.error('Get by ID error:', error);
     res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// 🔹 Update Testimonial
export const updateTestimonial = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, description, role, is_active } = req.body;

  try {
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
       res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
      return;
    }

    let image = existing.image;

    if (req.file?.buffer) {
      const result = await uploadToCloudinary(req.file.buffer, 'testimonials');
      image = result.secure_url;
    }

    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        name,
        description,
        role,
        image,
        is_active: is_active === 'false' ? false : true,
      },
    });

     res.status(200).json({
      success: true,
      message: 'Testimonial updated successfully',
      updated,
    });
  } catch (error) {
    console.error('Update error:', error);
     res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// 🔹 Delete Testimonial
export const deleteTestimonial = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    await prisma.testimonial.delete({ where: { id } });

     res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
     res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
