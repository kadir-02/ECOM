import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

// CREATE CATEGORY
export const createCategory = async (req: Request, res: Response) => {
  console.log(req.body)
  const { name, sequence_number, isDeleted } = req.body;
  

  try {
     const existingSeq = await prisma.category.findFirst({
      where: { sequence_number:  Number(sequence_number) },
    });

    if (existingSeq) {
      return res.status(400).json({
        success: false,
        message: "Sequence number already exists",
      });
    }

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
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 10;
    const skip = (page - 1) * pageSize;

    // Total count for pagination
    const totalCount = await prisma.category.count({
      where: { isDeleted: false },
    });

    // const categories = await prisma.category.findMany({
    //   where: { isDeleted: false },
    //   include: { subcategories: true },
    //   orderBy: { sequence_number: "asc" },
    //   skip,
    //   take: pageSize,
    // });

    const categories = await prisma.category.findMany({
      // where: { isDeleted: false },
      include: {
        subcategories: {
          // Include all subcategories, even soft-deleted ones
        },
      },
      orderBy: { sequence_number: "asc" },
      skip,
      take: pageSize,
    });

    res.status(200).json({
      success: true,
      total_pages: Math.ceil(totalCount / pageSize),
      current_page: page,
      page_size: pageSize,
      total_count: totalCount,
      categories,
    });
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
  const { category, page = "1" } = req.query;

  if (!category) {
     res.status(400).json({ success: false, message: "Category parameter is required" });
     return
  }

  const pageNumber = parseInt(page as string) || 1;
  const take = 8;
  const skip = (pageNumber - 1) * take;

  // Normalize category query to array of numbers
  const categoryIds = Array.isArray(category)
    ? category.map(id => Number(id)).filter(id => !isNaN(id))
    : String(category).split(',').map(id => Number(id)).filter(id => !isNaN(id));

  if (categoryIds.length === 0) {
     res.status(400).json({ success: false, message: "Invalid category IDs" });
     return
  }

  try {
    // Fetch full category details (including banner, imageUrl)
    const validCategories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        isDeleted: false,
      },
      include: {
        subcategories: true,
      },
    });

    const validCategoryIds = validCategories.map(c => c.id);

    if (validCategoryIds.length === 0) {
       res.status(404).json({ success: false, message: "No valid categories found" });
       return
    }

    // Fetch products, total count, and price range in parallel
    const [products, totalProducts, minMax] = await Promise.all([
      prisma.product.findMany({
        where: {
          categoryId: { in: validCategoryIds },
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
          categoryId: { in: validCategoryIds },
          isDeleted: false,
        },
      }),

      prisma.product.aggregate({
        where: {
          categoryId: { in: validCategoryIds },
          isDeleted: false,
        },
        _min: { sellingPrice: true },
        _max: { sellingPrice: true },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories: validCategories, // includes banner, imageUrl, etc.
        products,
        page: pageNumber,
        totalProducts,
        totalPages: Math.ceil(totalProducts / take),
        minSellingPrice: minMax._min.sellingPrice,
        maxSellingPrice: minMax._max.sellingPrice,
      },
    });
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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
