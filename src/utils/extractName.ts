import { Request } from 'express';
import prisma from '../db/prisma';
import { verifyToken } from './jwt';

export const getUserNameFromToken = async (req: Request): Promise<string> => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/Bearer |Token /, '').trim();
    if (!token) throw new Error('No token found');

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (!user) return 'ECOM Store';

    return user.profile?.firstName
      ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim()
      : user.email ?? 'ECOM Store';
  } catch {
    return 'ECOM Store';
  }
};
