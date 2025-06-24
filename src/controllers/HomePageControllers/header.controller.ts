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
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        profile: true,
      },
    });

    if (!user || !user.profile) {
      res
        .status(401)
        .json({
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
  const { ordering } = req.query;

  try {
    if (ordering === "-sequence_number") {
      const navlinks = await prisma.header.findMany({
        orderBy: {
          sequence_number: "desc",
        },
      });
      res.status(200).json({ success: true, result: navlinks });
      return;
    } else {
      const navlinks = await prisma.header.findMany({
        orderBy: {
          sequence_number: "asc",
        },
      });
      res.status(200).json({ success: true, result: navlinks });
      return;
    }
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
      const header = await prisma.header.update({
        where: {
            id : Number(header_id)
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

//   export const deleteHeaderData = async (req: Request, res: Response) => {
//     const {header_id} = req.params;


//   }