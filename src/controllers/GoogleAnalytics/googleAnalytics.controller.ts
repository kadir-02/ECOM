import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { formatReadableDate } from '../../utils/readableDate';
import { verifyToken } from '../../utils/jwt';

export const extractUserName = async (req: Request): Promise<string> => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Token ', '');
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (user?.profile?.firstName) {
      return `${user.profile.firstName} ${user.profile.lastName || ''}`.trim();
    }

    return user?.email || 'ECOM Store';
  } catch (err) {
    return 'ECOM Store';
  }
};

export const getAllTags = async (req: Request, res: Response) => {
  const id = req.query.id;

  // If ID is passed via query, fetch by ID
  if (id) {
    const tag = await prisma.googleAnalytics.findUnique({
      where: { id: Number(id) },
    });

    if (!tag) {
       res.status(404).json({ success: false, message: 'Tag not found' });
       return;
    }

     res.json({
      success: true,
      result: {
        id: tag.id,
        google_email: tag.google_email,
        tag: tag.tag,
        measurement_id: tag.measurement_id,
        is_active: tag.is_active,
        created_by: tag.created_by,
        created_at: formatReadableDate(tag.created_at),
        updated_by: tag.updated_by,
        updated_at: formatReadableDate(tag.updated_at),
      },
    });
    return
  }

  // If no ID, return latest (default)
  const tag = await prisma.googleAnalytics.findFirst({
    orderBy: { updated_at: 'desc' },
  });

  if (!tag) {
     res.json({ success: true, result: [] });
     return;
  }

   res.json({
    success: true,
    result: [
      {
        id: tag.id,
        google_email: tag.google_email,
        tag: tag.tag,
        measurement_id: tag.measurement_id,
        is_active: tag.is_active,
        created_by: tag.created_by,
        created_at: formatReadableDate(tag.created_at),
        updated_by: tag.updated_by,
        updated_at: formatReadableDate(tag.updated_at),
      },
    ],
  });
  return;
};

export const createTag = async (req: Request, res: Response) => {
  const { google_email, tag, measurement_id, is_active } = req.body;

  const user = await extractUserName(req);

  const newTag = await prisma.googleAnalytics.create({
    data: {
      google_email,
      tag,
      measurement_id,
      is_active,
      created_by: user,
      updated_by: user,
    },
  });

  res.status(201).json({ success: true, id: newTag.id });
};

export const updateTag = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { google_email, tag, measurement_id, is_active } = req.body;

  const user = await extractUserName(req);

  const existing = await prisma.googleAnalytics.findUnique({
    where: { id: Number(id) },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Tag not found' });
    return;
  }

  const updated = await prisma.googleAnalytics.update({
    where: { id: Number(id) },
    data: {
      google_email,
      tag,
      measurement_id,
      is_active,
      updated_by: user,
    },
  });

  res.json({
    success: true,
    result: {
      id: updated.id,
      google_email: updated.google_email,
      tag: updated.tag,
      measurement_id: updated.measurement_id,
      is_active: updated.is_active,
      created_by: updated.created_by,
      created_at: formatReadableDate(updated.created_at),
      updated_by: updated.updated_by,
      updated_at: formatReadableDate(updated.updated_at),
    },
  });
};

export const deleteTag = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.googleAnalytics.delete({
    where: { id: Number(id) },
  });

   res.json({ success: true, message: 'Deleted successfully' });
   return;
};
