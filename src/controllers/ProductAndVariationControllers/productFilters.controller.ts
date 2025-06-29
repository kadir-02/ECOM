import { Request, Response } from "express";
import prisma from "../../db/prisma";

export const getNewArrivalProducts = async (req: Request, res: Response) => {
  try {
    const newArrivals = await prisma.product.findMany({
      where: {
        isNewArrival: true,
        isActive: true,
        isDeleted: false,
      },
      orderBy: {
        sequenceNumber: "asc", 
      },
      include: {
        images: true,
        variants: true,
        category: true,
        subcategory: true,
      },
    });

    res.status(200).json({
      success: true,
      count: newArrivals.length,
      products: newArrivals,
    });
  } catch (error) {
    console.error("Error fetching new arrivals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch new arrival products",
    });
  }
};



export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
        isDeleted: false,
      },
      include: {
        images: {
          orderBy: { sequence: "asc" }, // optional: sort by image sequence
        },
        variants: {
          where: { isDeleted: false, is_active: true },
          include: {
            images: {
              where: { is_active: true },
              orderBy: { sequence_number: "asc" }, // optional: sort variant images
            },
          },
        },
        specifications: true,
        category: true,
        subcategory: true,
      },
    });

    if (!product) {
       res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return
    }

         res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product by slug:", error);
     res.status(500).json({
      success: false,
      message: "Something went wrong while fetching the product",
    });
    return
  }
};
