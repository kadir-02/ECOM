import { Request, Response } from 'express';
import prisma from '../db/prisma';
import dayjs from 'dayjs';
import fs from 'fs';
import * as fastcsv from 'fast-csv';

export interface PincodePayload {
  city: string;
  state: string;
  zipcode: number;
  estimated_delivery_days: number;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
}

export const formatDate = (date: Date): string =>
  dayjs(date).format('dddd, DD MMMM YYYY, hh:mmA');

export const getPaginatedPincodes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 10;
    const skip = (page - 1) * pageSize;

    const [totalCount, pincodes] = await Promise.all([
      prisma.pincode.count(),
      prisma.pincode.findMany({
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
    ]);

    const results = pincodes.map((p) => ({
      id: p.id,
      city: p.city,
      state: p.state,
      zipcode: p.zipcode,
      estimated_delivery_days: p.estimatedDeliveryDays,
      is_active: p.isActive,
      created_by: p.createdBy,
      updated_by: p.updatedBy,
      created_at: formatDate(p.createdAt),
      updated_at: formatDate(p.updatedAt),
    }));

    res.json({
      total_pages: Math.ceil(totalCount / pageSize),
      current_page: page,
      page_size: pageSize,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPincode = async (req: Request, res: Response) => {
  try {
    const {
      city,
      state,
      zipcode,
      estimated_delivery_days,
      is_active,
      created_by,
    }: PincodePayload = req.body;

    const newPincode = await prisma.pincode.create({
      data: {
        city,
        state,
        zipcode,
        estimatedDeliveryDays: estimated_delivery_days,
        isActive: is_active,
        createdBy: created_by,
        updatedBy: created_by,
      },
    });

    res.status(201).json(newPincode);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePincode = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      city,
      state,
      zipcode,
      estimated_delivery_days,
      is_active,
      updated_by,
    }: PincodePayload = req.body;

    const updated = await prisma.pincode.update({
      where: { id },
      data: {
        city,
        state,
        zipcode,
        estimatedDeliveryDays: estimated_delivery_days,
        isActive: is_active,
        updatedBy: updated_by || 'System',
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePincode = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.pincode.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const checkAvailability = async (req: Request, res: Response) => {
  const { pincode } = req.body;

  if (!pincode || isNaN(Number(pincode))) {
     res.status(400).json({ error: 'Invalid or missing pincode' });
     return
  }

  try {
    const result = await prisma.pincode.findFirst({
      where: {
        zipcode: Number(pincode),
        isActive: true,
      },
    });

    if (!result) {
       res.json({
        available: false,
        message: 'Pincode not serviceable',
      });
      return
    }

     res.json({
      available: true,
      pincode: result.zipcode,
      city: result.city,
      state: result.state,
      estimated_delivery_days: result.estimatedDeliveryDays,
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadCsvAndUpsertPincodes = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
       res.status(400).json({ message: 'No file uploaded' });
       return
    }

    const stream = fastcsv.parse({ headers: true, trim: true });
    let count = 0;

    stream.on('error', (error) => {
      console.error('CSV parse error:', error);
       res.status(400).json({ message: 'Error parsing CSV' });
       return
    });

    stream.on('data', async (row) => {
      stream.pause(); // pause to await DB write

      try {
        // Map CSV row to DB model
        const data = {
          city: row['CITY'],
          state: row['STATE'],
          zipcode: parseInt(row['ZIPCODE'], 10),
          estimatedDeliveryDays: parseInt(row['ESTIMATED DELIVERY TIME (in days)'], 10),
          isActive: true,
          createdBy: 'ECOM Store',
          updatedBy: 'ECOM Store',
        };

        // Upsert based on zipcode
        await prisma.pincode.upsert({
          where: { zipcode: data.zipcode },
          update: data,
          create: data,
        });

        count++;
      } catch (err) {
        console.error('Error processing row:', row, err);
      } finally {
        stream.resume(); // resume reading
      }
    });

    stream.on('end', () => {
       res.json({ message: 'Pincodes processed successfully', count });
       return
    });

    // pipe uploaded file buffer into fastcsv parser
    if (req.file.buffer) {
      stream.write(req.file.buffer);
      stream.end();
    } else {
       res.status(400).json({ message: 'File buffer is empty' });
       return
    }
  } catch (err) {
    console.error('Upload error:', err);
     res.status(500).json({ message: 'Internal server error' });
  }
};