import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

// 🔹 Create new company settings
export const createCompanySettings = async (req: Request, res: Response) => {
  try {
    const {
      country,
      currency,
      currency_symbol,
      address,
      phone,
      email,
      description,
      facebook_icon,
      facebook_link,
      instagram_icon,
      instagram_link,
      twitter_icon,
      twitter_link,
      linkedin_icon,
      linkedin_link,
      product_low_stock_threshold,
      minimum_order_quantity,
    } = req.body;

    let logoUrl: string | undefined;

    if (req.file && req.file.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'company/logos');
        logoUrl = result.secure_url;
      } catch (err) {
         res.status(500).json({
          message: 'Failed to upload logo image',
          details: (err as Error).message,
        });
      }
    }

    const settings = await prisma.companySettings.create({
      data: {
        country,
        currency,
        currency_symbol,
        address,
        phone,
        email,
        description,
        facebook_icon,
        facebook_link,
        instagram_icon,
        instagram_link,
        twitter_icon,
        twitter_link,
        linkedin_icon,
        linkedin_link,
        product_low_stock_threshold: Number(product_low_stock_threshold),
        minimum_order_quantity: Number(minimum_order_quantity),
        logo: logoUrl,
      },
    });

    res.status(201).json({ success:true, message: 'Settings created successfully', settings });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create company settings',
      details: (error as Error).message,
    });
  }
};

// 🔹 Get all company settings (you likely only have one)
export const getAllCompanySettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.companySettings.findMany();
    res.status(200).json({result:settings});
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve settings', details: (error as Error).message });
  }
};

// 🔹 Get settings by ID
export const getCompanySettingsById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const settings = await prisma.companySettings.findUnique({ where: { id } });

    if (!settings) {
       res.status(404).json({ message: 'Settings not found' });
       return;
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve settings', details: (error as Error).message });
  }
};

// 🔹 Update settings by ID
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.companySettings.update({
      where: { id },
      data,
    });

    res.status(200).json({ message: 'Settings updated successfully', updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', details: (error as Error).message });
  }
};

// 🔹 Delete settings by ID
export const deleteCompanySettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.companySettings.delete({ where: { id } });

    res.status(200).json({ message: 'Settings deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete settings', details: (error as Error).message });
  }
};

export const upsertCompanySettings = async (req: Request, res: Response) => {
  try {
    const {
      country,
      currency,
      currency_symbol,
      address,
      phone,
      email,
      description,
      facebook_icon,
      facebook_link,
      instagram_icon,
      instagram_link,
      twitter_icon,
      twitter_link,
      linkedin_icon,
      linkedin_link,
      product_low_stock_threshold,
      minimum_order_quantity,
    } = req.body;

    let logoUrl: string | undefined;

    if (req.file && req.file.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'company/logos');
        logoUrl = result.secure_url;
      } catch (err) {
         res.status(500).json({
          message: 'Failed to upload logo image',
          details: (err as Error).message,
        });
        return
      }
    }

    const data = {
      country,
      currency,
      currency_symbol,
      address,
      phone,
      email,
      description,
      facebook_icon,
      facebook_link,
      instagram_icon,
      instagram_link,
      twitter_icon,
      twitter_link,
      linkedin_icon,
      linkedin_link,
      product_low_stock_threshold: isNaN(Number(product_low_stock_threshold)) ? null : Number(product_low_stock_threshold),
      minimum_order_quantity: isNaN(Number(minimum_order_quantity)) ? null : Number(minimum_order_quantity),
      ...(logoUrl ? { logo: logoUrl } : {}),
    };

    const existing = await prisma.companySettings.findFirst();

    let result;
    if (existing) {
      result = await prisma.companySettings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      result = await prisma.companySettings.create({ data });
    }

    res.status(200).json({
      success: true,
      message: existing ? 'Company settings updated successfully' : 'Company settings created successfully',
      settings: result,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to upsert company settings',
      details: (error as Error).message,
    });
  }
};
