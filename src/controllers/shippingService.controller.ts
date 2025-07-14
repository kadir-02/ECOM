import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { formatReadableDate } from '../utils/readableDate';
import { getUserNameFromToken } from '../utils/extractName';

type ShippingProviderResponse = {
  id: number;
  name: string;
  url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  start_date: Date | null;
  end_date: Date | null;
  // Optional keys depending on provider
  aramex_username?: string | null;
  aramex_password?: string | null;
  aramex_account_number?: string | null;
  aramex_account_pin?: string | null;

  shiprocket_username?: string | null;
  shiprocket_password?: string | null;
  shiprocket_token?: string | null;

  usps_client_id?: string | null;
  usps_client_secret?: string | null;
};


export const getAllShippingServices = async (req: Request, res: Response) => {
  const services = await prisma.shippingService.findMany({
    orderBy: { updated_at: 'desc' },
  });

const response: {
  aramex: ShippingProviderResponse | null;
  shiprocket: ShippingProviderResponse | null;
  usps: ShippingProviderResponse | null;
} = {
  aramex: null,
  shiprocket: null,
  usps: null,
};

  services.forEach((s) => {
    const formatted = {
      id: s.id,
      name: s.name,
      url: s.url,
      is_active: s.is_active,
      created_by: s.created_by,
      created_at: formatReadableDate(s.created_at),
      updated_by: s.updated_by,
      updated_at: formatReadableDate(s.updated_at),
      start_date: s.start_date,
      end_date: s.end_date,
    };

    if (s.name === 'Aramex') {
      response.aramex = {
        ...formatted,
        aramex_username: s.aramex_username,
        aramex_password: s.aramex_password,
        aramex_account_number: s.aramex_account_number,
        aramex_account_pin: s.aramex_account_pin,
      };
    } else if (s.name === 'Shiprocket') {
      response.shiprocket = {
        ...formatted,
        shiprocket_username: s.shiprocket_username,
        shiprocket_password: s.shiprocket_password,
        shiprocket_token: s.shiprocket_token,
      };
    } else if (s.name === 'USPS') {
      response.usps = {
        ...formatted,
        usps_client_id: s.usps_client_id,
        usps_client_secret: s.usps_client_secret,
      };
    }
  });

  res.json({
    shipping_services: response,
  });
};

export const createShippingService = async (req: Request, res: Response) => {
  const created_by = await getUserNameFromToken(req);
  const {
    name,
    url,
    is_active,
    start_date,
    end_date,
    aramex_username,
    aramex_password,
    aramex_account_number,
    aramex_account_pin,
    shiprocket_username,
    shiprocket_password,
    shiprocket_token,
    usps_client_id,
    usps_client_secret,
  } = req.body;

  const newService = await prisma.shippingService.create({
    data: {
      name,
      url,
      is_active: is_active ?? true,
      created_by,
      updated_by: created_by,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      aramex_username,
      aramex_password,
      aramex_account_number,
      aramex_account_pin,
      shiprocket_username,
      shiprocket_password,
      shiprocket_token,
      usps_client_id,
      usps_client_secret,
    },
  });

  res.status(201).json({ success: true, id: newService.id });
};

export const updateShippingService = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated_by = await getUserNameFromToken(req);

  const {
    name,
    url,
    is_active,
    start_date,
    end_date,
    aramex_username,
    aramex_password,
    aramex_account_number,
    aramex_account_pin,
    shiprocket_username,
    shiprocket_password,
    shiprocket_token,
    usps_client_id,
    usps_client_secret,
  } = req.body;

  const updateData: any = {
    updated_by,
  };

  // Dynamically add only defined fields
  if (name !== undefined) updateData.name = name;
  if (url !== undefined) updateData.url = url;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (start_date !== undefined) updateData.start_date = start_date;
  if (end_date !== undefined) updateData.end_date = end_date;

  if (name === 'Aramex') {
    if (aramex_username !== undefined) updateData.aramex_username = aramex_username;
    if (aramex_password !== undefined) updateData.aramex_password = aramex_password;
    if (aramex_account_number !== undefined) updateData.aramex_account_number = aramex_account_number;
    if (aramex_account_pin !== undefined) updateData.aramex_account_pin = aramex_account_pin;
  } else if (name === 'Shiprocket') {
    if (shiprocket_username !== undefined) updateData.shiprocket_username = shiprocket_username;
    if (shiprocket_password !== undefined) updateData.shiprocket_password = shiprocket_password;
    if (shiprocket_token !== undefined) updateData.shiprocket_token = shiprocket_token;
  } else if (name === 'USPS') {
    if (usps_client_id !== undefined) updateData.usps_client_id = usps_client_id;
    if (usps_client_secret !== undefined) updateData.usps_client_secret = usps_client_secret;
  }

  const updated = await prisma.shippingService.update({
    where: { id: Number(id) },
    data: updateData,
  });

  res.json({
    success: true,
    result: {
      ...updated,
      created_at: formatReadableDate(updated.created_at),
      updated_at: formatReadableDate(updated.updated_at),
    },
  });
};