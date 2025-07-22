import { Request, Response } from "express";
import prisma from "../../db/prisma";

export const getSingleBlogInfo = async (req: Request, res: Response) => {
  const blogSlug = req.params.slug;

  try {
    const blog = await prisma.frontend_blog.findFirst({
      where: {
        slug: blogSlug,
      },
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
    });

    res.status(200).json({
      success: false,
      message: "Blog Data fetch sucessfully",
      data: blog,
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
