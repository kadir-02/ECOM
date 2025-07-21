import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { getUserNameFromToken } from "../../utils/extractName";

export const createSeoKeyword = async (req: Request, res: Response) => {
  const { name, is_active } = req.body;

  try {
    const username = await getUserNameFromToken(req);

    const keyword = await prisma.frontend_blogseofocuskeyword.create({
      data: {
        name,
        is_active,
        created_by: username,
        updated_by: username,
      },
    });

    res.status(201).json({
      success: true,
      message: "Keyword created",
      keyword,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateSeoKeyword = async (req: Request, res: Response) => {
  const { name, is_active } = req.body;
  const { id } = req.params;

  try {
    const username = await getUserNameFromToken(req);

    const keyword = await prisma.frontend_blogseofocuskeyword.update({
      where: {
        id: Number(id),
      },
      data: {
        name,
        is_active,
        updated_by: username,
      },
    });

    res.status(200).json({
      success: true,
      message: "Keyword Updated",
      keyword,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deleteSeoKeyword = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const keyword = await prisma.frontend_blogseofocuskeyword.delete({
      where: {
        id: Number(id),
      },
    });

    res.status(200).json({
      success: true,
      message: "Keyword Deleted",
      keyword,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getAllSeoKeywords = async (req: Request, res: Response) => {
  try {
    const {
      is_active,
      page = "1",
      page_size = "10",
      ordering,
      search = "",
    } = req.query as {
      is_active?: string;
      page?: string;
      page_size?: string;
      ordering?: string;
      search?: string;
    };

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(page_size);
    const skip = (pageNumber - 1) * limitNumber;

    // Extract ordering field and direction
    let orderByField = "created_at";
    let orderByDirection: "asc" | "desc" = "desc";

    if (ordering) {
      if (ordering.startsWith("-")) {
        const field = ordering.substring(1);
        if (["name", "created_at"].includes(field)) {
          orderByField = field;
          orderByDirection = "desc";
        }
      } else {
        if (["name", "created_at"].includes(ordering)) {
          orderByField = ordering;
          orderByDirection = "asc";
        }
      }
    }

    const whereClause: any = {
      AND: [
        search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {},
        is_active !== undefined
          ? {
              is_active: is_active === "true",
            }
          : {},
      ],
    };

    const [keywords, total] = await Promise.all([
      prisma.frontend_blogseofocuskeyword.findMany({
        where: whereClause,
        orderBy: {
          [orderByField]: orderByDirection,
        },
        skip,
        take: limitNumber,
      }),
      prisma.frontend_blogseofocuskeyword.count({
        where: whereClause,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Keywords fetched",
      data: {
        success: true,
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        keywords,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
