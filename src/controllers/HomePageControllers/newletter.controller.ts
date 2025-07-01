import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { Prisma } from '@prisma/client';

// Subscribe a new email
export const subscribeNewsletter = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
     res.status(400).json({ success: false, message: 'Email is required' });
     return
  }

  try {
    const existing = await prisma.newsLetter.findUnique({ where: { email } });

    if (existing) {
       res.status(200).json({ success: true, message: 'Already subscribed' });
       return
    }

    const newSubscription = await prisma.newsLetter.create({
      data: { email },
    });

    res.status(201).json({ success: true, message: 'Subscribed successfully', data: newSubscription });
  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
  }
};

// Get all newsletter emails (admin only, optional)
export const getAllSubscribers = async (req: Request, res: Response) => {
  const search = (req.query.search as string) || '';
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const page = parseInt(req.query.page as string) || 1;

  const skip = (page - 1) * pageSize;

  try {
    const where: Prisma.NewsLetterWhereInput = search
      ? {
          email: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        }
      : {};

    const [subscribers, total] = await Promise.all([
      prisma.newsLetter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.newsLetter.count({ where }),
    ]);

    const formattedResults = subscribers.map((s) => ({
      id: s.id,
      email: s.email,
      subscribed_at: new Date(s.createdAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).replace(',', ''),
    }));

    res.json({
      success: true,
      total_pages: Math.ceil(total / pageSize),
      current_page: page,
      page_size: pageSize,
      results: formattedResults,
    });
  } catch (error: any) {
    console.error('Fetch newsletter subscribers failed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscribers', error: error.message });
  }
};