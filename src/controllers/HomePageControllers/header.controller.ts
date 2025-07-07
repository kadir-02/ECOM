import { Request, Response } from "express";
import prisma from "../../db/prisma";

export const addHeaderData = async (req: Request, res: Response) => {
  const { sequence_number, name, link, is_active, userId } = req.body;

  if (
    sequence_number === undefined ||
    !name ||
    !link ||
    is_active === undefined ||
    !userId
  ) {
    res.status(400).json({ success: false, message: "Invalid JSON" });
    return;
  }

  try {
    const checkSequence = await prisma.header.findUnique({
      where: {
        sequence_number,
      },
    });
    if (checkSequence) {
      res
        .status(400)
        .json({
          success: false,
          message: "This sequence number already exists",
        });
    }
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        profile: true,
      },
    });

    if (!user || !user.profile) {
      res.status(401).json({
        success: false,
        message: "Invalid or incomplete User profile",
      });
      return;
    }

    const header = await prisma.header.create({
      data: {
        sequence_number,
        name,
        link,
        is_active,
        created_by: user.profile.firstName,
      },
    });
    res.status(201).json({ success: true, result: header });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHeaders = async (req: Request, res: Response) => {
  const { ordering, is_active } = req.query;

  // Convert "true"/"false" strings to boolean
  const isActiveParsed =
    typeof is_active === "string"
      ? is_active.toLowerCase() === "true"
        ? true
        : is_active.toLowerCase() === "false"
        ? false
        : undefined
      : undefined;

  try {
    const baseQuery: any = {
      orderBy: {
        sequence_number: ordering === "-sequence_number" ? "desc" : "asc",
      },
    };

    // Only apply filter if is_active is explicitly true/false
    if (typeof isActiveParsed === "boolean") {
      baseQuery.where = {
        is_active: isActiveParsed,
      };
    }

    const navlinks = await prisma.header.findMany(baseQuery);
    res.status(200).json({ success: true, result: navlinks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const updateHeaderData = async (req: Request, res: Response) => {
  const { sequence_number, name, link, is_active } = req.body;
  const { header_id } = req.params;

  if (
    sequence_number === undefined ||
    !name ||
    !link ||
    is_active === undefined
  ) {
    res.status(400).json({ success: false, message: "Invalid JSON" });
    return;
  }

  try {
    const checkSequence = await prisma.header.findUnique({
      where: {
        sequence_number,
      },
    });
    if (checkSequence && Number(header_id) !== checkSequence.id) {
      res
        .status(400)
        .json({
          success: false,
          message: "This sequence number already exists",
        });
        return;
    }
    const header = await prisma.header.update({
      where: {
        id: Number(header_id),
      },
      data: {
        sequence_number,
        name,
        link,
        is_active,
      },
    });
    res.status(200).json({ success: true, result: header });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteHeaderData = async (req: Request, res: Response) => {
  const { header_id } = req.params;

  if (!header_id || isNaN(Number(header_id))) {
    res.status(400).json({ success: false, message: "Invalid header ID" });
    return;
  }

  try {
    await prisma.header.delete({
      where: {
        id: Number(header_id),
      },
    });

    res
      .status(200)
      .json({ success: true, message: "Header deleted successfully" });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
    return;
  }
};
