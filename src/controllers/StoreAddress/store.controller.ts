import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { getUserNameFromToken } from '../../utils/extractName';
import { formatReadableDate } from '../../utils/readableDate';
import { Prisma } from '@prisma/client';
import * as fastcsv from 'fast-csv';
import { uploadMemory } from '../../upload/multerCloudinary';

export const getAllStores = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 10;
    const skip = (page - 1) * pageSize;

    // Optional filters
    const is_active = req.query.is_active !== undefined
      ? req.query.is_active === 'true' || req.query.is_active === '1'
      : undefined;

    const search = req.query.search ? String(req.query.search).trim() : undefined;

    // Ordering logic
    const orderingParam = (req.query.ordering as string) || 'id';
    const sortDirection: Prisma.SortOrder = orderingParam.startsWith('-') ? 'desc' : 'asc';
    const sortField = orderingParam.replace('-', '');

    const allowedOrderFields: (keyof Prisma.StoreOrderByWithRelationInput)[] = [
      'id', 'name', 'city', 'state', 'zipcode', 'created_at', 'updated_at',
    ];

    const orderBy: Prisma.StoreOrderByWithRelationInput =
      allowedOrderFields.includes(sortField as any)
        ? { [sortField]: sortDirection }
        : { id: 'asc' };

    // Build the where filter object
    const where: Prisma.StoreWhereInput = {
      ...(is_active !== undefined && { is_active }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { state: { contains: search, mode: 'insensitive' } },
          ...( /^\d+$/.test(search) ? [{ zipcode: Number(search) }] : [] ),
        ],
      }),
    };
    // Count total with filters
    const total = await prisma.store.count({ where });

    const results = await prisma.store.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
    });

    res.status(200).json({
      total_pages: Math.ceil(total / pageSize),
      current_page: page,
      page_size: pageSize,
      results: results.map((store) => ({
        ...store,
        created_at: formatReadableDate(store.created_at),
        updated_at: formatReadableDate(store.updated_at),
      })),
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const createStore = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone_numbers,
      address,
      locality,
      city,
      state,
      country,
      zipcode,
      latitude,
      longitude,
    } = req.body;

    const created_by = await getUserNameFromToken(req);

    // Convert to number early
    const numericZip = Number(zipcode);

    // ✅ Check if pincode already exists
    const existingPincode = await prisma.pincode.findFirst({
      where: {
        zipcode: numericZip,
        city,
        state,
      },
    });

    // ✅ Create pincode only if it doesn't exist
    if (!existingPincode) {
      await prisma.pincode.create({
        data: {
          city,
          state,
          zipcode: numericZip,
          estimatedDeliveryDays: 3, // or infer dynamically
          isActive: true,
          createdBy: created_by,
          updatedBy: created_by,
        },
      });
    }

    // ✅ Now create store
    const store = await prisma.store.create({
      data: {
        name,
        email,
        phone_numbers,
        address,
        locality,
        city,
        state,
        country,
        zipcode: numericZip,
        latitude,
        longitude,
        created_by,
        updated_by: created_by,
      },
    });

    res.status(201).json({ success: true, result: store });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create store' });
  }
};


export const updateStore = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.store.findUnique({ where: { id } });

  if (!existing) {
     res.status(404).json({ success: false, message: 'Store not found' });
     return;
  }

  try {
    const {
      name,
      email,
      phone_numbers,
      address,
      locality,
      city,
      state,
      country,
      zipcode,
      latitude,
      longitude,
      is_active,
    } = req.body;

    const updated_by = await getUserNameFromToken(req);

    const store = await prisma.store.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        email,
        phone_numbers,
        address,
        locality,
        city,
        state,
        country,
        zipcode: Number(zipcode) || existing.zipcode,
        latitude,
        longitude,
        is_active:
          is_active !== undefined
            ? is_active === 'true' || is_active === true
            : existing.is_active,
        updated_by,
      },
    });

    res.json({ success: true, result: store });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update store' });
  }
};

export const deleteStore = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.store.findUnique({ where: { id } });

  if (!existing) {
     res.status(404).json({ success: false, message: 'Store not found' });
     return;
  }

  await prisma.store.delete({ where: { id } });

  res.json({ success: true, message: 'Store deleted' });
};

const sanitizeNumber = (input: string | undefined): string => {
  if (!input) return '';
  return input.toString().replace(/[^\d]/g, '');
};

// export const uploadCsvAndUpsertStores = async (req: Request, res: Response) => {
//   try {
//     if (!req.file || !req.file.buffer) {
//        res.status(400).json({ message: 'No file uploaded or file is empty' });
//       return;
//     }

//     const stream = fastcsv.parse({ headers: true, trim: true });
//     const rows: any[] = [];
//     let count = 0;

//     stream.on('error', (error) => {
//       console.error('CSV parse error:', error);
//        res.status(400).json({ message: 'Error parsing CSV' });
//        return
//     });

//     stream.on('data', (row) => {
//       rows.push(row);
//     });

//     stream.on('end', async () => {
//       for (const row of rows) {
//         try {
//           const name = row['NAME']?.trim();
//           const address = row['ADDRESS']?.trim();
//           const city = row['CITY']?.trim();
//           const state = row['STATE']?.trim();
//           const zipcode = parseInt(sanitizeNumber(row['ZIP']), 10);

//           if (!name || !address || !city || !state || isNaN(zipcode)) {
//             console.warn('Skipping invalid row:', row);
//             continue;
//           }

//           const phone = sanitizeNumber(row['PHONE']);
//           const mobile = sanitizeNumber(row['MOBILE']);

//           const storeData = {
//             name,
//             address,
//             city,
//             state,
//             zipcode,
//             phone_numbers: [phone, mobile].filter(Boolean).join(', '),
//             email: null,
//             locality: '',
//             country: 'India',
//             latitude: '0.0',
//             longitude: '0.0',
//             is_active: true,
//             created_by: 'CSV Import',
//             updated_by: 'CSV Import',
//           };

//           const existing = await prisma.store.findFirst({ where: { name } });

//           if (existing) {
//             await prisma.store.update({
//               where: { id: existing.id },
//               data: storeData,
//             });
//           } else {
//             await prisma.store.create({ data: storeData });
//           }

//           count++;
//         } catch (err) {
//           console.error('Error processing row:', row, err);
//         }
//       }

//        res.status(200).json({ message: 'Store CSV processed successfully', count });
//        return
//     });

//     stream.write(req.file.buffer);
//     stream.end();
//   } catch (err) {
//     console.error('Upload error:', err);
//      res.status(500).json({ message: 'Internal server error' });
//      ;return
//   }
// };


export const uploadCsvAndUpsertStores = async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.file.buffer) {
       res.status(400).json({ message: 'No file uploaded or file is empty' });
       return;
    }

    const stream = fastcsv.parse({ headers: true, trim: true });
    const rows: any[] = [];
    let count = 0;

    stream.on('error', (error) => {
      console.error('CSV parse error:', error);
       res.status(400).json({ message: 'Error parsing CSV' });
       return;
    });

    stream.on('data', (row) => rows.push(row));

    stream.on('end', async () => {
      for (const row of rows) {
        try {
          const name = row['NAME']?.trim();
          const address = row['ADDRESS']?.trim();
          const city = row['CITY']?.trim();
          const state = row['STATE']?.trim();
          const zipcode = parseInt(sanitizeNumber(row['ZIP']), 10);

          if (!name || !address || !city || !state || isNaN(zipcode)) {
            console.warn('Skipping invalid row:', row);
            continue;
          }

          const phone = sanitizeNumber(row['PHONE']);
          const mobile = sanitizeNumber(row['MOBILE']);
          const latitude = row['LATITUDE']?.trim() || '0.0';
          const longitude = row['LONGITUDE']?.trim() || '0.0';
          const estimatedDeliveryDays = parseInt(row['DELIVERY_DAYS']?.trim(), 10) || 3;

          const storeData = {
            name,
            address,
            city,
            state,
            zipcode,
            phone_numbers: [phone, mobile].filter(Boolean).join(', '),
            latitude,
            longitude,
            country: 'India',
            is_active: true,
            created_by: 'CSV Import',
            updated_by: 'CSV Import',
          };

          // ✅ Ensure pincode exists or create
          const existingPincode = await prisma.pincode.findFirst({
            where: { zipcode, city, state },
          });

          if (!existingPincode) {
            await prisma.pincode.create({
              data: {
                city,
                state,
                zipcode,
                estimatedDeliveryDays,
                isActive: true,
                createdBy: 'CSV Import',
                updatedBy: 'CSV Import',
              },
            });
          }

          // ✅ Upsert store by name
          const existingStore = await prisma.store.findFirst({
            where: { name },
          });

          if (existingStore) {
            await prisma.store.update({
              where: { id: existingStore.id },
              data: storeData,
            });
          } else {
            await prisma.store.create({ data: storeData });
          }

          count++;
        } catch (err) {
          console.error('Error processing row:', row, err);
        }
      }

       res.status(200).json({
        message: 'Store CSV processed successfully',
        count,
      });
      return;
    });

    stream.write(req.file.buffer);
    stream.end();
  } catch (err) {
    console.error('Upload error:', err);
     res.status(500).json({ message: 'Internal server error' });
     return;
  }
};