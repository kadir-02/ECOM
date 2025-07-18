import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { verifyToken } from '../../utils/jwt';

export const extractUserName = async (req: Request): Promise<string> => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (user?.profile?.firstName) {
      return `${user.profile.firstName} ${user.profile.lastName || ''}`.trim();
    }

    return user?.email || 'Superb Store';
  } catch (err) {
    return 'ECOM Store';
  }
};

export const getHomepageStatistics = async (req: Request, res: Response) => {
  const { page = '1', page_size = '10', is_active } = req.query;

  const pageNumber = parseInt(page as string);
  const pageSize = parseInt(page_size as string);
  const skip = (pageNumber - 1) * pageSize;

  const where: any = {};
  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
  }

  const results = await prisma.homepageStatistic.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: { updated_at: 'desc' },
  });

  res.json({
    results: results.map((item:any) => ({
      id: item.id,
      title: item.title,
      number: item.number,
      is_active: item.is_active,
      created_by: item.created_by,
      created_at: item.created_at,
      updated_by: item.updated_by,
      updated_at: item.updated_at,
    })),
  });
};

export const createHomepageStatistic = async (req: Request, res: Response) => {
  const { title, number, is_active } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Token missing' });
    return;
  }

  const user = await extractUserName(req);
  const createdBy = 'ECOM Store'; // optionally fetch from profile using payload.userId

  const newStat = await prisma.homepageStatistic.create({
    data: {
      title,
      number: Number(number),
      is_active,
      created_by: user,
      updated_by: user,
    },
  });

  res.status(201).json({ success: true, id: newStat.id });
};

export const updateHomepageStatistic = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, number, is_active } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  const user = await extractUserName(req);

  const stat = await prisma.homepageStatistic.findUnique({ where: { id: Number(id) } });
  if (!stat) {
     res.status(404).json({ success: false, message: 'Statistic not found' });
     return;
  }

  const updated = await prisma.homepageStatistic.update({
    where: { id: Number(id) },
    data: {
      title,
      number: Number(number),
      is_active,
      updated_by: user,
    },
  });

  res.json({
    success: true,
    result: {
      id: updated.id,
      title: updated.title,
      number: updated.number,
      is_active: updated.is_active,
      created_by: updated.created_by,
      created_at: updated.created_at,
      updated_by: updated.updated_by,
      updated_at: updated.updated_at
    },
  });
};

export const deleteHomepageStatistic = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.homepageStatistic.delete({
    where: { id: Number(id) },
  });

  res.json({ success: true, message: 'Deleted successfully' });
};
