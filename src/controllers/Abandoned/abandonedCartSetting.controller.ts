import { Request, Response } from 'express';
import prisma  from '../../db/prisma';
import { formatReadableDate } from '../../utils/readableDate';
import { getUserNameFromToken } from '../../utils/extractName';

export const getAllAbandonedCartSettings = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 10;
    const skip = (page - 1) * pageSize;

    const ordering = (req.query.ordering as string) || 'id';
    const isActive = req.query.is_active;

    const where: any = {};
    if (isActive !== undefined) {
      where.is_active = isActive === 'true';
    }

    const total = await prisma.abandonedCartSetting.count({ where });

    const results = await prisma.abandonedCartSetting.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [ordering.replace('-', '')]: ordering.startsWith('-') ? 'desc' : 'asc',
      },
    });

    res.status(200).json({
      total_pages: Math.ceil(total / pageSize),
      current_page: page,
      page_size: pageSize,
      results: results.map((item) => ({
        ...item,
        created_at: formatReadableDate(item.created_at),
        updated_at: formatReadableDate(item.updated_at),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch abandoned cart settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAbandonedCartSetting = async (req: Request, res: Response) => {
  try {
    const {
      hours_after_email_is_sent,
      discount_to_be_given_in_percent,
      hours_after_email_cart_is_emptied,
      is_active
    } = req.body;
    const user=await getUserNameFromToken(req)
    const data = {
      hours_after_email_is_sent: parseInt(hours_after_email_is_sent, 10),
      discount_to_be_given_in_percent: parseInt(discount_to_be_given_in_percent, 10),
      hours_after_email_cart_is_emptied: parseInt(hours_after_email_cart_is_emptied, 10),
      is_active: Boolean(is_active),
      created_by: user || 'System',
      updated_by: user || 'System',
    };

    const setting = await prisma.abandonedCartSetting.create({ data });
    res.status(201).json({ success: true, result: setting });
  } catch (error) {
    console.error('Failed to create abandoned cart setting:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const updateAbandonedCartSetting = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      hours_after_email_is_sent,
      discount_to_be_given_in_percent,
      hours_after_email_cart_is_emptied,
      is_active,
    } = req.body;

    const user = await getUserNameFromToken(req);

    const data: any = {
      updated_by: user || 'System',
    };

    if (hours_after_email_is_sent !== undefined) {
      data.hours_after_email_is_sent = parseInt(hours_after_email_is_sent, 10);
    }

    if (discount_to_be_given_in_percent !== undefined) {
      data.discount_to_be_given_in_percent = parseInt(discount_to_be_given_in_percent, 10);
    }

    if (hours_after_email_cart_is_emptied !== undefined) {
      data.hours_after_email_cart_is_emptied = parseInt(hours_after_email_cart_is_emptied, 10);
    }

    if (is_active !== undefined) {
      data.is_active = is_active === true || is_active === 'true';
    }

    const updated = await prisma.abandonedCartSetting.update({
      where: { id },
      data,
    });

    res.status(200).json({ success: true, result: updated });
  } catch (error) {
    console.error('Failed to update abandoned cart setting:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const deleteAbandonedCartSetting = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.abandonedCartSetting.delete({ where: { id } });
    res.status(204).send({success:true,message:'Cart setting deleted'});
  } catch (error) {
    console.error('Failed to delete abandoned cart setting:', error);
    res.status(500).json({ success:false,message: 'Internal server error' });
  }
};
