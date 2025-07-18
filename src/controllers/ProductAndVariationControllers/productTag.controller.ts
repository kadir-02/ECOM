import { Request, Response } from 'express';
import prisma from '../../db/prisma';
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

export const getAllProductTags = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 10;
  const skip = (page - 1) * pageSize;

  const [tags, totalCount] = await Promise.all([
    prisma.productTag.findMany({
      skip,
      take: pageSize,
      orderBy: { updated_at: 'desc' },
    }),
    prisma.productTag.count(),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  res.json({
    total_pages: totalPages,
    current_page: page,
    page_size: pageSize,
    results: tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      is_active: tag.is_active,
      created_by: tag.created_by,
      created_at: tag.created_at,
      updated_by: tag.updated_by,
      updated_at: tag.updated_at,
    })),
  });
};

export const createProductTag = async (req: Request, res: Response) => {
  const { name, is_active } = req.body;

  const userName = await extractUserName(req);

  const newTag = await prisma.productTag.create({
    data: {
      name,
      is_active,
      created_by: userName,
      updated_by: userName,
    },
  });

  res.status(201).json({
    success: true,
    result: {
      id: newTag.id,
      name: newTag.name,
      is_active: newTag.is_active,
      created_by: newTag.created_by,
      created_at: newTag.created_at,
      updated_by: newTag.updated_by,
      updated_at: newTag.updated_at,
    },
  });
};

export const updateProductTag = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, is_active } = req.body;

  const updater = await extractUserName(req);

  const updated = await prisma.productTag.update({
    where: { id: Number(id) },
    data: {
      name,
      is_active,
      updated_by: updater,
    },
  });

  res.json({
    success: true,
    result: {
      id: updated.id,
      name: updated.name,
      is_active: updated.is_active,
      created_by: updated.created_by,
      created_at: updated.created_at,
      updated_by: updated.updated_by,
      updated_at: updated.updated_at,
    },
  });
};

export const deleteProductTag = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.productTag.delete({
    where: { id: Number(id) },
  });

  res.json({ success: true, message: 'Deleted successfully' });
};
