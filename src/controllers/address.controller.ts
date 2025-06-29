import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { CustomRequest } from '../middlewares/authenticate';

export const createAddress = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  console.log(req.body);
  try {
    const address = await prisma.address.create({
      data: {
        ...req.body,
        userId,
      },
    });
    res.status(201).json({message:"Address Added Successfully",address});
  } catch (error) {
    res.status(500).json({ message: 'Failed to create address', error });
  }
};

export const getUserAddresses = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  try {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
    res.json({address:addresses});
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch addresses', error });
  }
};

export const updateAddress = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  try {
    const updated = await prisma.address.update({
      where: { id: Number(id) },
      data: req.body,
    });
    res.json({message:"Address Updated Successfully",updated});
  } catch (error) {
    res.status(500).json({ message: 'Failed to update address', error });
  }
};

export const deleteAddress = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  try {
    const address = await prisma.address.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: 'address deleted', address: address });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete address', error });
  }
};

export const setDefaultAddress = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  try {
    // Reset other addresses
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set selected one to default
    const updated = await prisma.address.update({
      where: { id: Number(id) },
      data: { isDefault: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to set default address', error });
  }
};
