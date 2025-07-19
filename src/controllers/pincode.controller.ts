import { Request, Response } from 'express';
import prisma from '../db/prisma';
import dayjs from 'dayjs';
import fs from 'fs';
import * as fastcsv from 'fast-csv';
import { getUserNameFromToken } from '../utils/extractName';

export interface PincodePayload {
  city: string;
  state: string;
  zipcode: number;
  estimated_delivery_days: number;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
}


// export const getPaginatedPincodes = async (req: Request, res: Response) => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const pageSize = parseInt(req.query.page_size as string) || 10;
//     const skip = (page - 1) * pageSize;

//     const isActiveParam = req.query.is_active;
//     const isActive =
//       typeof isActiveParam === 'string'
//         ? isActiveParam.toLowerCase() === 'true'
//           ? true
//           : isActiveParam.toLowerCase() === 'false'
//           ? false
//           : undefined
//         : undefined;

//         const search = req.query.search?.toString().trim();
//           const whereClause: any = {};
//      if (isActive !== undefined) {
//       whereClause.isActive = isActive;
//     }

//    if (search) {
//   const searchInt = parseInt(search);
//   const orConditions: any[] = [
//     { city: { contains: search, mode: 'insensitive' } },
//     { state: { contains: search, mode: 'insensitive' } },
//   ];

//   if (!isNaN(searchInt)) {
//     orConditions.push({ zipcode: searchInt });
//   }

//   whereClause.OR = orConditions;
// }



//     const [totalCount, pincodes] = await Promise.all([
//       prisma.pincode.count({ where: whereClause }),
//       prisma.pincode.findMany({
//         where: whereClause,
//         skip,
//         take: pageSize,
//         orderBy: { id: 'desc' },
//       }),
//     ]);

//     const results = pincodes.map((p) => ({
//       id: p.id,
//       city: p.city,
//       state: p.state,
//       zipcode: p.zipcode,
//       estimated_delivery_days: p.estimatedDeliveryDays,
//       is_active: p.isActive,
//       created_by: p.createdBy,
//       updated_by: p.updatedBy,
//       created_at: p.createdAt,
//       updated_at: p.updatedAt,
//     }));

//     res.json({
//       total_pages: Math.ceil(totalCount / pageSize),
//       current_page: page,
//       page_size: pageSize,
//       results,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

export const getPaginatedPincodes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 10;
    const skip = (page - 1) * pageSize;

    const isActiveParam = req.query.is_active;
    const isActive =
      typeof isActiveParam === 'string'
        ? isActiveParam.toLowerCase() === 'true'
        : undefined;

    const search = req.query.search?.toString().trim();
    const whereClause: any = {};

    if (typeof isActive === 'boolean') {
      whereClause.isActive = isActive;
    }

    // Fetch all matching records (before search filter)
    const allPincodes = await prisma.pincode.findMany({
      where: whereClause,
      orderBy: { id: 'desc' },
    });

    // Manual filtering for partial search (including partial zipcode)
    const filtered = allPincodes.filter((p) => {
      const cityMatch = p.city.toLowerCase().includes(search?.toLowerCase() || '');
      const stateMatch = p.state.toLowerCase().includes(search?.toLowerCase() || '');
      const zipMatch = p.zipcode.toString().includes(search || '');
      return search ? cityMatch || stateMatch || zipMatch : true;
    });

    const paginated = filtered.slice(skip, skip + pageSize);

    const results = paginated.map((p) => ({
      id: p.id,
      city: p.city,
      state: p.state,
      zipcode: p.zipcode,
      estimated_delivery_days: p.estimatedDeliveryDays,
      is_active: p.isActive,
      created_by: p.createdBy,
      updated_by: p.updatedBy,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));

    res.json({
      total_pages: Math.ceil(filtered.length / pageSize),
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
    const user = await getUserNameFromToken(req)
    const newPincode = await prisma.pincode.create({
      data: {
        city,
        state,
        zipcode,
        estimatedDeliveryDays: estimated_delivery_days,
        isActive: is_active,
        createdBy: user,
        updatedBy: user,
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
    }: PincodePayload = req.body;

    const user = await getUserNameFromToken(req);

    const data: any = {};

    if (city) data.city = city;
    if (state) data.state = state;
    if (typeof is_active !== 'undefined') data.isActive = is_active;
    if (estimated_delivery_days != null) data.estimatedDeliveryDays = Number(estimated_delivery_days);
    if (zipcode != null) {
      const zip = Number(zipcode);

      // Check for duplicate zipcode
      const existingZip = await prisma.pincode.findFirst({
        where: {
          zipcode: zip,
          NOT: { id },
        },
      });

      if (existingZip) {
         res.status(400).json({
          success: false,
          message: 'Zipcode already exists',
        });
        return;
      }

      data.zipcode = zip;
    }

    data.updatedBy = user || 'System';

    const updated = await prisma.pincode.update({
      where: { id },
      data,
    });

    res.json({ success: true, pincode: updated });
  } catch (err: any) {
    console.error('Update pincode error:', err);
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