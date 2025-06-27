import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { generateSlug } from "../../utils/slugify";

// CREATE PRODUCT
export const createProduct = async (req: Request, res: Response) => {
  const isNumeric = (value: any): boolean => {
    return !isNaN(value) && value !== null && value !== "";
  };

  try {
    const {
      name,
      description,
      SKU,
      basePrice,
      sellingPrice,
      priceDifferencePercent,
      stock,
      isNewArrival,
      createdById,
      categoryId,
      subcategoryId,
      length,
      width,
      weight,
      sequenceNumber,
      seoTitle,
      seoKeyword,
      seoDescription,
      productDetails,
      is_active,
    } = req.body;

    const errors = [];

    if (!name) errors.push("Name is required.");
    if (!SKU) errors.push("SKU is required.");
    if (!isNumeric(basePrice))
      errors.push("Base price must be a valid number.");
    if (!isNumeric(sellingPrice))
      errors.push("Selling price must be a valid number.");
    if (!isNumeric(priceDifferencePercent))
      errors.push("Price difference percent must be a number.");
    if (!isNumeric(stock)) errors.push("Stock must be a valid number.");
    if (isNewArrival === undefined) errors.push("isNewArrival is required.");
    if (is_active === undefined) errors.push("isActive is required.");
    if (!isNumeric(createdById))
      errors.push("createdById is required and must be a number.");
    if (!isNumeric(categoryId))
      errors.push("categoryId is required and must be a number.");

    if (errors.length > 0) {
      res
        .status(400)
        .json({ success: false, message: "Validation failed", errors });
      return;
    }

    const slug = await generateSlug(name, SKU);

    const latestProductInCategory = await prisma.product.findFirst({
      where: { categoryId: Number(categoryId) },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true },
    });

    const nextSequenceNumber = latestProductInCategory?.sequenceNumber
      ? latestProductInCategory.sequenceNumber + 1
      : 1;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        SKU,
        basePrice: parseFloat(basePrice),
        sellingPrice: parseFloat(sellingPrice),
        priceDifferencePercent: parseFloat(priceDifferencePercent),
        stock: parseInt(stock),
        isNewArrival: isNewArrival === "true",
        isActive: is_active,
        isDeleted: false,
        createdById: Number(createdById),
        updatedById: Number(createdById),
        categoryId: Number(categoryId),
        subcategoryId: subcategoryId ? Number(subcategoryId) : null,
        length,
        width,
        weight,
        slug,
        sequenceNumber: nextSequenceNumber,
        seoTitle,
        seoKeyword,
        seoDescription,
        productDetails,
      },
    });

    res.status(201).json({ success: true, product });
  } catch (error: any) {
    console.error("Create product error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const whereClause: any = {
      isDeleted: false, // only fetch non-deleted products
    };

    if (category && !isNaN(Number(category))) {
      whereClause.categoryId = Number(category);
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        subcategory: true,
        images: true,
        variants: true,
        specifications: true,
      },
      orderBy: {
        sequenceNumber: "asc",
      },
    });

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error: any) {
    console.error("Get products error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProductSequence = async (req: Request, res: Response) => {
  try {
    const updates: Array<{ id: number; sequence_number: number }> =
      req.body.sequencePayload;

    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid payload. Expected an array of { id, sequence_number }.",
        });
      return;
    }

    for (const item of updates) {
      if (
        !item.id ||
        !item.sequence_number ||
        isNaN(item.id) ||
        isNaN(item.sequence_number)
      ) {
        res.status(400).json({
          success: false,
          message:
            "Each item must have a valid numeric 'id' and 'sequence_number'.",
        });
        return;
      }
    }

    // Run updates in a transaction
    await prisma.$transaction(
      updates.map((item) =>
        prisma.product.update({
          where: { id: item.id },
          data: { sequenceNumber: item.sequence_number },
        })
      )
    );

    res
      .status(200)
      .json({
        success: true,
        message: "Product sequence numbers updated successfully.",
      });
  } catch (error: any) {
    console.error("Update product sequence error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
