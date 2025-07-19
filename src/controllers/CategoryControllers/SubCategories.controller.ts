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

  if (isNaN(sequence_number) || sequence_number <= 0) {
     res.status(400).json({
      success: false,
      message: "sequence_number must be a positive number",
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

    const duplicateSequence = await prisma.subcategory.findFirst({
      where: {
        categoryId: parent_category,
        sequence_number: sequence_number,
      },
    });

    if (duplicateSequence) {
       res.status(400).json({
        success: false,
        message: "Sequence number already exists for this parent category",
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
      where: { categoryId: Number(parent_category) },
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

  if (!name || !sequence_number) {
     res.status(400).json({
      success: false,
      message: "Name and sequence_number are required",
    });
    return
  }

  if (isNaN(sequence_number) || sequence_number <= 0) {
     res.status(400).json({
      success: false,
      message: "sequence_number must be a positive number",
    });
    return;
  }

  try {
    const subcategoryId = Number(id);

    // 1. Check if subcategory exists
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
    });

    if (!existingSubcategory) {
       res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
      return
    }

    const duplicateSequence = await prisma.subcategory.findFirst({
      where: {
        categoryId: existingSubcategory.categoryId,
        sequence_number: sequence_number,
        NOT: { id: subcategoryId },
      },
    });

    if (duplicateSequence) {
       res.status(400).json({
        success: false,
        message: "Sequence number already exists for this sub category",
      });
      return;
    }

    let imageUrl = existingSubcategory.imageUrl;
    let banner = existingSubcategory.banner;
    let publicId = existingSubcategory.publicId;

    // 2. Handle image update
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

    // 3. Handle banner update
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

    // 4. Perform update
    const updatedSubcategory = await prisma.subcategory.update({
      where: { id: subcategoryId },
      data: {
        name,
        sequence_number: Number(sequence_number),
        isDeleted:
          typeof isDeleted !== "undefined"
            ? isDeleted === "true" || isDeleted === true
            : existingSubcategory.isDeleted,
        imageUrl,
        banner,
        publicId,
      },
    });

     res.status(200).json({
      success: true,
      message: "Subcategory updated",
      subcategory: updatedSubcategory,
    });
  } catch (error: any) {
    console.error("Update subcategory error:", error);
     res.status(500).json({
      success: false,
      message: error.message || "Error updating subcategory",
    });
  }
};

export const deleteSubcategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const subcategoryId = Number(id);

    // Check if subcategory exists
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
    });

    if (!existingSubcategory) {
      res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
      return;
    }

    // Option 1: Soft delete (mark as deleted)
    // await prisma.subcategory.update({
    //   where: { id: subcategoryId },
    //   data: { isDeleted: true },
    // });

    // Option 2: Hard delete (remove from DB)
    await prisma.subcategory.delete({
      where: { id: subcategoryId },
    });

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete subcategory error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting subcategory",
    });
  }
};