import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import { getUserNameFromToken } from '../../utils/extractName';

// GET all
export const getAllAboutUsSections = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;

    const activeFilter =
      typeof is_active !== 'undefined'
        ? { is_active: String(is_active).toLowerCase() === 'true' }
        : {};

    const sections = await prisma.aboutUsSection.findMany({
      where: {
        ...activeFilter,
      },
      orderBy: { sequence_number: 'asc' },
      include: {
        components: {
          where: {
            ...activeFilter,
          },
          orderBy: { sequence_number: 'asc' },
        },
      },
    });

    const results = sections.map((section: any) => ({
      id: section.id,
      sequence_number: section.sequence_number,
      section_name: section.section_name,
      heading: section.heading,
      sub_heading: section.sub_heading,
      description: section.description,
      image: section.image,
      is_active: section.is_active,
      created_by: section.created_by,
      updated_by: section.updated_by,
      created_at: section.created_at,
      updated_at: section.updated_at,

      components: section.components.map((component: any) => ({
        id: component.id,
        sequence_number: component.sequence_number,
        title: component.title,
        description: component.description,
        heading: component.heading,
        sub_heading: component.sub_heading,
        image: component.image,
        is_active: component.is_active,
        created_by: component.created_by,
        updated_by: component.updated_by,
        created_at: component.created_at,
        updated_at: component.updated_at,
      })),
    }));

    res.json({ results });
  } catch (error) {
    console.error('Error fetching About Us sections:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH (Edit)
export const updateAboutUsSection = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.aboutUsSection.findUnique({ where: { id } });

  if (!existing) {
     res.status(404).json({ success: false, message: 'Section not found' });
     return;
  }

  const {
    sequence_number,
    section_name,
    heading,
    sub_heading,
    description,
    is_active,
  } = req.body;

  let image = existing.image;

  try {
    const seq = Number(sequence_number);
    if (!isNaN(seq) && seq <= 0) {
       res.status(400).json({
        success: false,
        message: `sequence_number must be a positive number`,
      });
      return;
    }

    // Check for duplicate sequence_number if changed
    if (
      typeof sequence_number !== 'undefined' &&
      Number(sequence_number) !== existing.sequence_number
    ) {
      const duplicate = await prisma.aboutUsSection.findFirst({
        where: {
          sequence_number: Number(sequence_number),
          NOT: { id },
        },
      });

      if (duplicate) {
         res.status(400).json({
          success: false,
          message: `This sequence number already exists`,
        });
        return;
      }
    }

    // Upload new image if provided
    if (req.file?.buffer) {
      const upload = await uploadToCloudinary(req.file.buffer, 'aboutus_section');
      image = upload.secure_url;
    }

    const updated_by = await getUserNameFromToken(req);

    const updated = await prisma.aboutUsSection.update({
      where: { id },
      data: {
        sequence_number: typeof sequence_number !== 'undefined'
          ? Number(sequence_number)
          : existing.sequence_number,
        section_name: typeof section_name !== 'undefined'
          ? section_name
          : existing.section_name,
        heading: typeof heading !== 'undefined'
          ? heading
          : existing.heading,
        sub_heading: typeof sub_heading !== 'undefined'
          ? sub_heading
          : existing.sub_heading,
        description: typeof description !== 'undefined'
          ? description
          : existing.description,
        image,
        is_active: typeof is_active !== 'undefined'
          ? is_active === 'true' || is_active === true
          : existing.is_active,
        updated_by,
      },
    });

    res.json({
      success: true,
      message: 'Section updated',
      result: {
        ...updated,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// DELETE
export const deleteAboutUsSection = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const existing = await prisma.aboutUsSection.findUnique({ where: { id } });

  if (!existing) {
     res.status(404).json({ success: false, message: 'Section not found' });
     return
  }

  await prisma.aboutUsSection.delete({ where: { id } });

  res.json({ success: true, message: 'Section deleted successfully' });
};

export const createAboutUsSection = async (req: Request, res: Response) => {
  try {
    const {
      sequence_number,
      section_name,
      heading,
      sub_heading,
      description,
      is_active,
    } = req.body;

    const created_by = await getUserNameFromToken(req);
    const seq=Number(sequence_number)
    if (seq != null && seq <= 0) {
      res.status(400).json({
        success: false,
        message: `sequence_number is not positive`,
      });
      return;
    }
    // 🔍 Check for duplicate sequence_number
    const existing = await prisma.aboutUsSection.findFirst({
      where: { sequence_number: Number(sequence_number) },
    });

    if (existing) {
       res.status(400).json({
        success: false,
        message: `This sequence number already exists`,
      });
      return;
    }

    let image: string | null = null;

    if (req.file?.buffer) {
      const result = await uploadToCloudinary(req.file.buffer, 'aboutus_section');
      image = result.secure_url;
    }

    const newSection = await prisma.aboutUsSection.create({
      data: {
        sequence_number: Number(sequence_number),
        section_name,
        heading,
        sub_heading,
        description,
        image,
        is_active: is_active === 'true' || is_active === true,
        created_by,
        updated_by: created_by,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      result: {
        ...newSection,
        created_at: newSection.created_at,
        updated_at: newSection.updated_at,
      },
    });
  } catch (err) {
    console.error('Create AboutUsSection error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};