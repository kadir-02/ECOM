import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { generateSlug } from '../utils/slugify';
import { buildProductQuery } from '../utils/productFilters';
import cloudinary from '../upload/cloudinary';


interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export const createProduct = async (req: Request, res: Response) => {
  const { name, description, categoryId, subcategoryId, basePrice, tags } = req.body;

  try {
    let imageUrl: string | undefined;
    let publicId: string | undefined;

    if (req.file) {
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result as CloudinaryUploadResult);
          }
        );
        uploadStream.end(req.file?.buffer);
      });

      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const slug = await generateSlug(name);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        imageUrl,
        publicId,
        basePrice: basePrice ? parseFloat(basePrice) : undefined,
        categoryId: parseInt(categoryId),
        subcategoryId: parseInt(subcategoryId),
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
      },
    });

    res.status(201).json({ success: true, message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Error creating product' });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  const { where, orderBy, skip, limit, page } = buildProductQuery(req.query);

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          subcategory: true,
          variants: { include: { images: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      result: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
};

export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  if (!slug) {
    res.status(400).json({ success: false, message: 'Missing slug' });
    return;
  }

  try {
    const foundProduct = await prisma.product.findUnique({
      where: { slug, isDeleted: false },
      include: {
        category: true,
        subcategory: true,
        variants: { include: { images: true } },
      },
    });

    if (!foundProduct) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Product found', product: foundProduct });
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    res.status(500).json({ success: false, message: 'Error fetching product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, description, categoryId, subcategoryId, basePrice, tags } = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    let imageUrl = existing.imageUrl;
    let publicId = existing.publicId;

    if (req.file) {
      if (publicId) {
        await cloudinary.uploader.destroy(publicId).catch((err) => {
          console.warn('Failed to delete old image from Cloudinary:', err.message);
        });
      }

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result as CloudinaryUploadResult);
          }
        );
        uploadStream.end(req.file?.buffer);
      });

      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        imageUrl,
        publicId,
        basePrice: basePrice ? parseFloat(basePrice) : undefined,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        subcategoryId: subcategoryId ? parseInt(subcategoryId) : undefined,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : existing.tags,
      },
    });

    res.status(200).json({ success: true, message: 'Product updated', product: updated });
  } catch (error: any) {
    console.error('Update product error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(500).json({ success: false, message: 'Error updating product', details: error.message });
  }
};

export const softDeleteProduct = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.status(200).json({ success: true, message: 'Product soft deleted', product: updated });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Product not found' });
    } else {
      console.error('Soft delete product error:', error);
      res.status(500).json({ success: false, message: 'Error soft deleting product' });
    }
  }
};

export const restoreProduct = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const restored = await prisma.product.update({
      where: { id },
      data: { isDeleted: false },
    });

    res.status(200).json({ success: true, message: 'Product restored', product: restored });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Product not found' });
    } else {
      console.error('Restore product error:', error);
      res.status(500).json({ success: false, message: 'Error restoring product' });
    }
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (product.publicId) {
      await cloudinary.uploader.destroy(product.publicId).catch((err) => {
        console.warn('Failed to delete Cloudinary image:', err.message);
      });
    }

    await prisma.product.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Product and image deleted' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Product not found' });
    } else {
      res.status(500).json({ success: false, message: 'Error deleting product' });
    }
  }
};

export const getBestSellingProducts = async (req: Request, res: Response) => {
  const productLimit = Number(req.query.limit!) || 10;
  try {
    const highSelling = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        }
      },
      take: productLimit,
    });

    if (highSelling.length === 0) {
      res.status(200).json({ success: true, data: [], message: 'No sales found' });
      return;
    }

    const pIds = highSelling.map(i => i.productId).filter((id): id is number => id !== null);

    const products = await prisma.product.findMany({
      where: {
        id: { in: pIds },
        isDeleted: false,
      },
      include: {
        category: true,
        subcategory: true,
        variants: {
          include: { images: true }
        }
      }
    });

    const highSellingProducts = products.map(product => {
      const salesData = highSelling.find(b => b.productId === product.id);
      return {
        ...product,
        totalQuantitySold: salesData?._sum?.quantity || 0,
      };
    });

    highSellingProducts.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

    res.status(200).json({ success: true, message: 'Best-selling products fetched', data: highSellingProducts });
  } catch (error) {
    console.error('Error fetching best selling products:', error);
    res.status(500).json({ success: false, message: 'Error fetching best selling products' });
  }
};
