import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

// CREATE CATEGORY
export const createCategory = async (req: Request, res: Response) => {
  const { name, sequence_number, isDeleted } = req.body;

  try {
    let imageUrl: string | undefined;
    let banner: string | undefined;
    let publicId: string | undefined;

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

    const category = await prisma.category.create({
      data: {
        name,
        sequence_number: Number(sequence_number),
        imageUrl,
        banner,
        publicId,
        isDeleted:isDeleted === "true" || isDeleted === true
      },
    });

    res
      .status(201)
      .json({ success: true, message: "Category created", category });
  } catch (error) {
    console.error("Create category error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating category" });
  }
};

// GET ALL CATEGORIES
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      // where: { isDeleted: false },
      include: { subcategories: true },
      orderBy: { sequence_number: "asc" },
    });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error retrieving categories" });
  }
};

export const getFrontendCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isDeleted: false },
      include: { subcategories: true },
      orderBy: { sequence_number: "asc" },
    });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error retrieving categories" });
  }
};

// GET CATEGORY BY ID
export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = "1" } = req.query;

  const pageNumber = parseInt(page as string) || 1;
  const take = 8;
  const skip = (pageNumber - 1) * take;

  try {
    // Check if category exists
    const categoryCheck = await prisma.category.findUnique({
      where: { id: Number(id) },
      select: { id: true, isDeleted: true },
    });

    if (!categoryCheck || categoryCheck.isDeleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Fetch paginated products
    const [products, totalProducts, minMax] = await Promise.all([
      prisma.product.findMany({
        where: {
          categoryId: Number(id),
          isDeleted: false,
        },
        include: {
          variants: {
            where: { isDeleted: false },
            include: { images: true },
          },
          images: true,
        },
        skip,
        take,
      }),

      prisma.product.count({
        where: {
          categoryId: Number(id),
          isDeleted: false,
        },
      }),

      prisma.product.aggregate({
        where: {
          categoryId: Number(id),
          isDeleted: false,
        },
        _min: {
          sellingPrice: true,
        },
        _max: {
          sellingPrice: true,
        },
      }),
    ]);

    // Fetch subcategories
    const subcategories = await prisma.subcategory.findMany({
      where: { categoryId: Number(id) },
    });

    const categoryData = {
      id: categoryCheck.id,
      subcategories,
      products,
      page: pageNumber,
      totalProducts,
      totalPages: Math.ceil(totalProducts / take),
      minSellingPrice: minMax._min.sellingPrice,
      maxSellingPrice: minMax._max.sellingPrice,
    };

    res.status(200).json({ success: true, category: categoryData });
  } catch (error) {
    console.error("Get category by ID error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error retrieving category" });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, sequence_number, isDeleted } = req.body;

  try {
    const data: any = {};

    console.log("isDeleted", isDeleted);
    if (name) data.name = name;
    if (typeof isDeleted !== "undefined") {
      data.isDeleted = isDeleted === "true" || isDeleted === true;
    }
    if (sequence_number) data.sequence_number = Number(sequence_number);

    if (req.files && "image" in req.files) {
      const imageFile = Array.isArray(req.files["image"])
        ? req.files["image"][0]
        : req.files["image"];
      const result = await uploadToCloudinary(
        imageFile.buffer,
        "categories/image"
      );
      data.imageUrl = result.secure_url;
      data.publicId = result.public_id;
    }

    if (req.files && "banner" in req.files) {
      const bannerFile = Array.isArray(req.files["banner"])
        ? req.files["banner"][0]
        : req.files["banner"];
      const result = await uploadToCloudinary(
        bannerFile.buffer,
        "categories/banner"
      );
      data.banner = result.secure_url;
    }
    console.log("data", data);
    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data,
    });

    res
      .status(200)
      .json({ success: true, message: "Category updated", category: updated });
  } catch (error: any) {
    console.error("Update category error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// HARD DELETE
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.category.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error:any) {
    console.error("Delete category error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting category", error:error.message });
  }
};

// SOFT DELETE
export const softDeleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data: { isDeleted: true },
    });
    res
      .status(200)
      .json({
        success: true,
        message: "Category soft deleted",
        category: updated,
      });
  } catch (error) {
    console.error("Soft delete category error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error soft deleting category" });
  }
};

// RESTORE
export const restoreCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const restored = await prisma.category.update({
      where: { id: Number(id) },
      data: { isDeleted: false },
    });
    res
      .status(200)
      .json({
        success: true,
        message: "Category restored",
        category: restored,
      });
  } catch (error) {
    console.error("Restore category error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error restoring category" });
  }
};
