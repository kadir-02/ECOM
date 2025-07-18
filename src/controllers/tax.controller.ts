// src/controllers/tax.controller.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { getUserNameFromToken } from '../utils/extractName';

export const getAllTaxes = async (req: Request, res: Response) => {
  const search = (req.query.search as string) || '';

  const taxes = await prisma.tax.findMany({
    where: {
      name: {
        contains: search,
        mode: 'insensitive',
      },
    },
    orderBy: {
      updated_at: 'desc',
    },
  });

  res.json({
    taxes: taxes.map((tax) => ({
      id: tax.id,
      name: tax.name,
      percentage: tax.percentage.toFixed(1),
      is_active: tax.is_active,
      created_by: tax.created_by,
      created_at: tax.created_at,
      updated_by: tax.updated_by,
      updated_at: tax.updated_at,
    })),
  });
};

export const createTax = async (req: Request, res: Response) => {
  const { name, percentage, is_active } = req.body;
  const created_by = await getUserNameFromToken(req);

  const newTax = await prisma.tax.create({
    data: {
      name,
      percentage: parseFloat(percentage),
      is_active,
      created_by,
      updated_by: created_by,
    },
  });

  res.status(201).json({
    success: true,
    tax: {
      id: newTax.id,
      name: newTax.name,
      percentage: newTax.percentage.toFixed(1),
      is_active: newTax.is_active,
      created_by: newTax.created_by,
      created_at: newTax.created_at,
      updated_by: newTax.updated_by,
      updated_at: newTax.updated_at,
    },
  });
};

export const updateTax = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, percentage, is_active } = req.body;
  const updated_by = await getUserNameFromToken(req);

  const updated = await prisma.tax.update({
    where: { id: Number(id) },
    data: {
      name,
      percentage: parseFloat(percentage),
      is_active,
      updated_by,
    },
  });

  res.json({
    success: true,
    tax: {
      id: updated.id,
      name: updated.name,
      percentage: updated.percentage.toFixed(1),
      is_active: updated.is_active,
      created_by: updated.created_by,
      created_at: updated.created_at,
      updated_by: updated.updated_by,
      updated_at: updated.updated_at,
    },
  });
};

export const deleteTax = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.tax.delete({
    where: { id: Number(id) },
  });
  res.json({ success: true, message: 'Deleted successfully' });
};
