import { Request, Response } from "express";
import prisma from "../../db/prisma";

export const createShippingRate = async (req: Request, res: Response) => {
  try {
    const { state, intra_state_rate, inter_state_rate, is_active } = req.body;

    if (!state || intra_state_rate == null || inter_state_rate == null) {
       res.status(400).json({ message: "All fields are required." });
       return
    }

    const existing = await prisma.shippingRate.findUnique({ where: { state } });
    if (existing) {
       res.status(409).json({ message: "Shipping rate for this state already exists." });
       return
    }

    const newRate = await prisma.shippingRate.create({
      data: {
        state,
        intra_state_rate: parseFloat(intra_state_rate),
        inter_state_rate: parseFloat(inter_state_rate),
        is_active: Boolean(is_active), // ensure it's boolean
      },
    });

    res.status(201).json(newRate);
  } catch (error) {
    res.status(500).json({ message: "Error creating shipping rate.", error });
  }
};

export const getAllShippingRates = async (_req: Request, res: Response) => {
  try {
    const rates = await prisma.shippingRate.findMany({
    //   where: {
    //     is_active: true,
    //   },
    });
    res.status(200).json({success:true,rates});
  } catch (error) {
    res.status(500).json({ message: "Error fetching active shipping rates.", error });
  }
};

export const deleteShippingRate = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.shippingRate.findUnique({ where: { id } });
    if (!existing) {
       res.status(404).json({ message: "Shipping rate not found." });
       return
    }

    await prisma.shippingRate.delete({ where: { id } });
    res.status(200).json({ message: "Shipping rate deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting shipping rate.", error });
  }
};

export const updateShippingRate = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { state, intra_state_rate, inter_state_rate, is_active } = req.body;

    const existing = await prisma.shippingRate.findUnique({ where: { id } });
    if (!existing) {
       res.status(404).json({ message: "Shipping rate not found." });
       return
    }

    const updated = await prisma.shippingRate.update({
      where: { id },
      data: {
        state: state ?? existing.state,
        intra_state_rate: intra_state_rate != null ? parseFloat(intra_state_rate) : existing.intra_state_rate,
        inter_state_rate: inter_state_rate != null ? parseFloat(inter_state_rate) : existing.inter_state_rate,
        is_active: is_active != null ? Boolean(is_active) : existing.is_active,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating shipping rate.", error });
  }
};
