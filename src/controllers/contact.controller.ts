import { Request, Response } from 'express';
import prisma from '../db/prisma'; // adjust path
import { Prisma } from '@prisma/client';

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

interface UserProfile {
  firstName: string;
  lastName: string;
  bio?: string;
  imageUrl?: string;
}

interface User {
  id: number;
  email: string;
  role: 'USER' | 'ADMIN' | string;
  profile?: UserProfile | null;
}

interface CustomRequest extends Request {
  user?: User;
}

export const getContactRequests = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string)?.trim() || '';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 10;

    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { phone_number: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const [totalCount, records] = await Promise.all([
      prisma.contactRequest.count({ where: whereClause }),
      prisma.contactRequest.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const formatted = records.map((rec) => ({
      id: rec.id,
      created_at: formatDate(rec.created_at),
      updated_at: formatDate(rec.updated_at),
      name: rec.name,
      email: rec.email,
      phone_number: rec.phone_number,
      city: rec.city || '',
      state: rec.state || '',
      country: rec.country || '',
      own_retail_space: rec.own_retail_space,
      subject: rec.subject || '',
      message: rec.message || '',
      contacted_the_customer: rec.contacted_the_customer,
      reply_given: rec.reply_given || null,
      updated_by: rec.updated_by || '',
    }));

    res.status(200).json({
      total_pages: totalPages,
      current_page: page,
      page_size: pageSize,
      results: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching contact requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getContactRequestById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
     res.status(400).json({ message: 'Invalid ID' });
     return
  }

  try {
    const contact = await prisma.contactRequest.findUnique({ where: { id } });

    if (!contact) {
       res.status(404).json({ message: 'Contact request not found' });
       return
    }

    res.json({
      ...contact,
      created_at: formatDate(contact.created_at),
      updated_at: formatDate(contact.updated_at),
    });
  } catch (error: any) {
    console.error('Error fetching contact request by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markContactAsHandled = async (req: Request, res: Response) => {
  const customReq = req as CustomRequest;  // type cast here

  const id = Number(customReq.params.id);
  const { contacted_the_customer, reply_given } = customReq.body;

  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid contact request ID' });
    return;
  }

  try {
    const updated = await prisma.contactRequest.update({
      where: { id },
      data: {
        contacted_the_customer: Boolean(contacted_the_customer),
        reply_given: reply_given || null,
        updated_by: customReq.user?.profile?.firstName || '',  // safe access
      },
    });

    res.json({ message: 'Contact request updated', contact: updated });
  } catch (error: any) {
    console.error('Error updating contact request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteContactRequest = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
     res.status(400).json({ message: 'Invalid ID' });
     return
  }

  try {
    await prisma.contactRequest.delete({ where: { id } });
    res.json({ message: 'Contact request deleted' });
  } catch (error: any) {
    console.error('Error deleting contact request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createContactRequest = async (req: Request, res: Response) => {
  const customReq = req as CustomRequest;

  const {
    name,
    email,
    phone_number,
    city,
    state,
    country,
    own_retail_space,
    subject,
    message,
  } = req.body;

  if (!name || !email || !phone_number) {
    res.status(400).json({ message: 'Name, email and phone number are required' });
    return;
  }

  try {
    const newContact = await prisma.contactRequest.create({
      data: {
        name,
        email,
        phone_number,
        city: city || null,
        state: state || null,
        country: country || null,
        own_retail_space: own_retail_space ?? null,
        subject: subject || null,
        message: message || null,
        contacted_the_customer: false,
        reply_given: null,
        updated_by: customReq.user?.profile?.firstName || '',
      },
    });

    res.status(201).json({ message: 'Contact request created', contact: newContact });
  } catch (error: any) {
    console.error('Error creating contact request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};