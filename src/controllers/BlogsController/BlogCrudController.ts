import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { getUserNameFromToken } from "../../utils/extractName";
import { generateCategorySlug } from "../CategoryControllers/category.controller";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

export const createblog = async (req: Request, res: Response) => {
  try {
    const {
      title,
      is_active,
      content,
      product_tag_id,
      author,
      image_alternate_text,
      seo_metadata,
      seo_title,
      publish_date,
      tagjoints,
      seofocuskeywordjoints,
    } = req.body;

    // Basic validation
    if (!title || !content || !author || !seo_title || !publish_date) {
      res.status(400).json({
        success: false,
        message: "Required fields are missing.",
      });
      return;
    }

    // Parse relations from string if sent as JSON strings
    const tagIds: number[] = Array.isArray(tagjoints)
      ? tagjoints.map(Number)
      : typeof tagjoints === "string"
      ? JSON.parse(tagjoints)
      : [];

    const keywordIds: number[] = Array.isArray(seofocuskeywordjoints)
      ? seofocuskeywordjoints.map(Number)
      : typeof seofocuskeywordjoints === "string"
      ? JSON.parse(seofocuskeywordjoints)
      : [];

    // Validate tag IDs exist
    const existingTags = await prisma.frontend_blogtag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true },
    });
    const validTagIds = existingTags.map((t) => t.id);

    // Validate keyword IDs exist
    const existingKeywords = await prisma.frontend_blogseofocuskeyword.findMany(
      {
        where: { id: { in: keywordIds } },
        select: { id: true },
      }
    );
    const validKeywordIds = existingKeywords.map((k) => k.id);

    // Upload image to Cloudinary if present
    let imageUrl: string | undefined;

    if (req.files && "image" in req.files) {
      const mainFile = Array.isArray(req.files["image"])
        ? req.files["image"][0]
        : req.files["image"];

      if (mainFile?.buffer) {
        try {
          const result = await uploadToCloudinary(mainFile.buffer, "blogs");
          imageUrl = result.secure_url;
        } catch (err) {
          res.status(500).json({
            success: false,
            message: "Failed to upload image to Cloudinary.",
            details: (err as Error).message,
          });
          return;
        }
      }
    }

    const username = await getUserNameFromToken(req);

    // Generate slug
    let baseSlug = generateCategorySlug(title);
    let slug = baseSlug;
    let count = 1;
    while (await prisma.frontend_blog.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    // Create blog with relations
    const blog = await prisma.frontend_blog.create({
      data: {
        title,
        slug,
        content,
        is_active: is_active === "true" || is_active === true,
        image: imageUrl,
        image_alternate_text,
        created_by: username,
        updated_by: username,
        product_tag_id: product_tag_id ? parseInt(product_tag_id) : null,
        author,
        publish_date: new Date(publish_date),
        seo_metadata,
        seo_title,
        tagjoints: {
          create: validTagIds.map((tagId) => ({
            tag_id: tagId,
            is_active: true,
            // created_by: username,
            // updated_by: username,
          })),
        },
        seofocuskeywordjoints: {
          create: validKeywordIds.map((keywordId) => ({
            keyword_id: keywordId,
            is_active: true,
            // created_by: username,
            // updated_by: username,
          })),
        },
      },
      include: {
        tagjoints: true,
        seofocuskeywordjoints: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const blogId = parseInt(req.params.id);
    const {
      title,
      is_active,
      content,
      product_tag_id,
      author,
      image_alternate_text,
      seo_metadata,
      seo_title,
      publish_date,
      tagjoints,
      seofocuskeywordjoints,
    } = req.body;


    if (!blogId) {
      res.status(400).json({
        success: false,
        message: "Invalid blog ID.",
      });
      return;
    }

    const existingBlog = await prisma.frontend_blog.findUnique({
      where: { id: blogId },
    });

    if (!existingBlog) {
      res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
      return;
    }

    if (!title || !content || !author || !seo_title || !publish_date) {
      res.status(400).json({
        success: false,
        message: "Required fields are missing.",
      });
      return;
    }

    // Parse and validate tag IDs
    const tagIds: number[] = Array.isArray(tagjoints)
      ? tagjoints.map(Number)
      : typeof tagjoints === "string"
      ? JSON.parse(tagjoints)
      : [];

    const keywordIds: number[] = Array.isArray(seofocuskeywordjoints)
      ? seofocuskeywordjoints.map(Number)
      : typeof seofocuskeywordjoints === "string"
      ? JSON.parse(seofocuskeywordjoints)
      : [];

    const existingTags = await prisma.frontend_blogtag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true },
    });
    const validTagIds = existingTags.map((t) => t.id);

    const existingKeywords = await prisma.frontend_blogseofocuskeyword.findMany(
      {
        where: { id: { in: keywordIds } },
        select: { id: true },
      }
    );
    const validKeywordIds = existingKeywords.map((k) => k.id);

    // Upload new image if present
    let imageUrl: string | null | undefined = existingBlog.image;

    if (req.files && "image" in req.files) {
      const mainFile = Array.isArray(req.files["image"])
        ? req.files["image"][0]
        : req.files["image"];

      if (mainFile?.buffer) {
        const result = await uploadToCloudinary(mainFile.buffer, "blogs");
        imageUrl = result.secure_url;
      }
    }

    const username = await getUserNameFromToken(req);

    // Generate new slug if title is changed
    let slug = existingBlog.slug;
    if (title !== existingBlog.title) {
      let baseSlug = generateCategorySlug(title);
      slug = baseSlug;
      let count = 1;

      while (
        await prisma.frontend_blog.findFirst({
          where: {
            slug,
            NOT: { id: blogId },
          },
        })
      ) {
        slug = `${baseSlug}-${count++}`;
      }
    }

    // First remove existing tag & keyword joints
    await prisma.frontend_blogandtagjoint.deleteMany({
      where: { blog_id: blogId },
    });
    await prisma.frontend_blogandseofocuskeywordjoint.deleteMany({
      where: { blog_id: blogId },
    });

    // Now update blog with new data & relations
    const updatedBlog = await prisma.frontend_blog.update({
      where: { id: blogId },
      data: {
        title,
        slug,
        content,
        is_active: is_active === "true" || is_active === true,
        image: imageUrl,
        image_alternate_text,
        updated_by: username,
        product_tag_id: product_tag_id ? parseInt(product_tag_id) : null,
        author,
        publish_date: new Date(publish_date),
        seo_metadata,
        seo_title,
        tagjoints: {
          create: validTagIds.map((tag_id) => ({
            tag_id,
            is_active: true,
            // created_by: username,
            // updated_by: username,
          })),
        },
        seofocuskeywordjoints: {
          create: validKeywordIds.map((keyword_id) => ({
            keyword_id,
            is_active: true,
            // created_by: username,
            // updated_by: username,
          })),
        },
      },
      include: {
        tagjoints: true,
        seofocuskeywordjoints: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error: any) {
    console.error("Update blog error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const toggleBlogActiveStatus = async (req: Request, res: Response) => {
  try {
    const blogId = parseInt(req.params.blogId); // Ensure this matches route param
    const { is_active } = req.body;

    if (!blogId || typeof is_active === "undefined") {
       res.status(400).json({
        success: false,
        message: "Invalid blog ID or missing is_active value.",
      });
      return;
    }

    const existingBlog = await prisma.frontend_blog.findUnique({
      where: { id: blogId },
    });

    if (!existingBlog) {
       res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
      return
    }

    const toBoolean = (val: any): boolean =>
      typeof val === 'boolean' ? val : String(val).toLowerCase() === 'true';

    const updatedBlog = await prisma.frontend_blog.update({
      where: { id: blogId },
      data: {
        is_active: toBoolean(is_active),
        updated_by: await getUserNameFromToken(req),
      },
    });

    res.status(200).json({
      success: true,
      message: `Blog ${toBoolean(is_active) ? "activated" : "deactivated"} successfully.`,
      blog: updatedBlog,
    });
  } catch (error: any) {
    console.error("Toggle is_active error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const blogId = parseInt(req.params.id);

    if (isNaN(blogId)) {
      res.status(400).json({
        success: false,
        message: "Invalid blog ID.",
      });
      return;
    }

    // Check if blog exists
    const blog = await prisma.frontend_blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
      return;
    }

    // Delete from tag joint table
    await prisma.frontend_blogandtagjoint.deleteMany({
      where: { blog_id: blogId },
    });

    // Delete from SEO focus keyword joint table
    await prisma.frontend_blogandseofocuskeywordjoint.deleteMany({
      where: { blog_id: blogId },
    });

    // Now delete the blog
    await prisma.frontend_blog.delete({
      where: { id: blogId },
    });

    res.status(200).json({
      success: true,
      message: "Blog and associated mappings deleted successfully.",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
    return;
  }
};

export const getBlogs = async (req: Request, res: Response) => {
  try {
    const {
      is_active,
      page = "1",
      page_size = "10",
      ordering,
      search = "",
      tag_id
    } = req.query as {
      is_active?: string;
      page?: string;
      page_size?: string;
      ordering?: string;
      search?: string;
      tag_id?: string;
    };

    const pageNumber = parseInt(page);
    const pageSizeNumber = parseInt(page_size);

    const skip = (pageNumber - 1) * pageSizeNumber;
    const take = pageSizeNumber;

    const where: any = {
      ...(is_active !== undefined && { is_active: is_active === "true" }),
      ...(tag_id !== undefined && {product_tag_id : Number(tag_id)}),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const orderBy: any = ordering
      ? ordering.startsWith("-")
        ? { [ordering.slice(1)]: "desc" }
        : { [ordering]: "asc" }
      : { created_at: "desc" };

    const [blogs, total] = await Promise.all([
      prisma.frontend_blog.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          tagjoints: {
            include: {
              frontend_blogtag: true,
            },
          },
          seofocuskeywordjoints: {
            include: {
              seo_focus_keyword: true,
            },
          },
        },
      }),
      prisma.frontend_blog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSizeNumber);

    res.status(200).json({
      success: true,
      total,
      totalPages,
      page: pageNumber,
      page_size: pageSizeNumber,
      data: blogs,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
    return;
  }
};

export const duplicateBlog = async (req: Request, res: Response) => {
  const blogId = parseInt(req.params.id);

  try {
    const original = await prisma.frontend_blog.findUnique({
      where: { id: blogId },
      include: {
        tagjoints: true,
        seofocuskeywordjoints: true,
      },
    });

    if (!original) {
       res.status(404).json({ message: 'Blog not found' });
       return;
    }

    const username = await getUserNameFromToken(req);

    const duplicated = await prisma.frontend_blog.create({
      data: {
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        content: original.content,
        image: original.image,
        created_by: username || 'admin',
        updated_by: username || 'admin',
        product_tag_id: original.product_tag_id,
        author: original.author,
        publish_date: new Date(),
        image_alternate_text: original.image_alternate_text,
        seo_metadata: original.seo_metadata,
        seo_title: original.seo_title,
        is_active: false,
      },
    });

    // Duplicate TAG JOINTS (without created_by/updated_by)
    if (original.tagjoints.length > 0) {
      await prisma.frontend_blogandtagjoint.createMany({
        data: original.tagjoints.map((tag) => ({
          blog_id: duplicated.id,
          tag_id: tag.tag_id,
          is_active: tag.is_active,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: username || 'admin',
          updated_by: username || 'admin',
        })),
      });
    }

    // Duplicate SEO FOCUS KEYWORD JOINTS (without created_by/updated_by)
    if (original.seofocuskeywordjoints.length > 0) {
      await prisma.frontend_blogandseofocuskeywordjoint.createMany({
        data: original.seofocuskeywordjoints.map((item) => ({
          blog_id: duplicated.id,
          keyword_id: item.keyword_id,
          is_active: item.is_active,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: username || 'admin',
          updated_by: username || 'admin',
        })),
      });
    }

     res.status(201).json({ message: 'Blog duplicated', blog: duplicated });
  } catch (error: any) {
    console.error('Error duplicating blog:', error);
     res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

