import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

export const createSubcategory = async (req: Request, res: Response) => {
  const { name, sequence_number, isDeleted, parent_category } = req.body;

  if (!name || !parent_category || !sequence_number) {
    res.status(400).json({
      success: false,
      message: "Name, parent_category, and sequence_number are required",
    });
    return;
  }

  try {
    // 1. Verify that the category exists
    const existingCategory = await prisma.category.findUnique({
      where: {
        id: Number(parent_category),
      },
    });

    if (!existingCategory) {
      res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
      return;
    }

    // 2. Upload image and banner
    let imageUrl: string | undefined;
    let banner: string | undefined;
    let publicId: string | undefined;

    if (req.files && "image" in req.files) {
      const imageFile = Array.isArray(req.files["image"])
        ? req.files["image"][0]
        : req.files["image"];

      const result = await uploadToCloudinary(
        imageFile.buffer,
        "subcategories/image"
      );
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    if (req.files && "banner" in req.files) {
      const bannerFile = Array.isArray(req.files["banner"])
        ? req.files["banner"][0]
        : req.files["banner"];

      const result = await uploadToCloudinary(
        bannerFile.buffer,
        "subcategories/banner"
      );
      banner = result.secure_url;
    }

    // 3. Create subcategory
    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        sequence_number: Number(sequence_number),
        categoryId: Number(parent_category),
        imageUrl,
        banner,
        publicId,
        isDeleted: isDeleted === "true" || isDeleted === true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Subcategory created",
      subcategory,
    });
    return;
  } catch (error: any) {
    console.error("Create subcategory error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating subcategory",
    });
    return;
  }
};

export const getSubcategoryByCategoryId = async (
  req: Request,
  res: Response
) => {
  const { parent_category } = req.query;

  try {
    const subcategory = await prisma.subcategory.findMany({
      where: { categoryId: Number(parent_category), isDeleted: true },
      orderBy: {
        sequence_number: "asc",
      },

      // include: { category: true, products: true },
    });

    if (subcategory?.length === 0) {
      res.status(404).json({ message: "Subcategory not found" });
      return;
    }

    res.status(200).json({ success: true, subcategory });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubCategory = async (req: Request, res: Response) => {
  const { name, sequence_number, isDeleted } = req.body;
  const { id } = req.params;

  console.log("req.body;", req.body);
  if (!name || !sequence_number) {
    res.status(400).json({
      success: false,
      message: "Name, parent_category, and sequence_number are required",
    });
    return;
  }

  try {
    const categoryId = Number(id);

    // 1. Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    let imageUrl = existingCategory.imageUrl;
    let banner = existingCategory.banner;
    let publicId = existingCategory.publicId;

    // 2. Handle image update
    if (req.files && "image" in req.files) {
      const imageFile = Array.isArray(req.files["image"])
        ? req.files["image"][0]
        : req.files["image"];
      const result = await uploadToCloudinary(
        imageFile.buffer,
        "categories/image"
      );
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    // 3. Handle banner update
    if (req.files && "banner" in req.files) {
      const bannerFile = Array.isArray(req.files["banner"])
        ? req.files["banner"][0]
        : req.files["banner"];
      const result = await uploadToCloudinary(
        bannerFile.buffer,
        "categories/banner"
      );
      banner = result.secure_url;
    }

    // 4. Perform update
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name || existingCategory.name,
        sequence_number: sequence_number
          ? Number(sequence_number)
          : existingCategory.sequence_number,
        isDeleted:
          typeof isDeleted !== "undefined"
            ? isDeleted === "true" || isDeleted === true
            : existingCategory.isDeleted,
        imageUrl,
        banner,
        publicId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Category updated",
      category: updatedCategory,
    });
    return;
  } catch (error: any) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating category",
    });
    return;
  }
};
