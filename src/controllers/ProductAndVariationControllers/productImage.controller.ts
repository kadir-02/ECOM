import { Request, Response } from "express";
import prisma from "../../db/prisma";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

export const createProductImage = async (req: Request, res: Response) => {
  const { productId, sequence } = req.body;
  if (!productId || !req.files) {
     res.status(400).json({ message: "productId and images are required" });
     return;
  }

  try {
    const createdImages = [];
    for (const file of req.files as Express.Multer.File[]) {
      const result = await uploadToCloudinary(file.buffer, "products/images");
      const created = await prisma.productImage.create({
        data: {
          productId: Number(productId),
          image: result.secure_url,
          sequence: sequence ? Number(sequence) : 0,
        },
      });
      createdImages.push(created);
    }
    res.status(201).json({ success: true, productImages: createdImages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating product images" });
  }
};

export const deleteProductImage = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.productImage.delete({ where: { id } });
    res.json({ success: true, message: "Product image deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product image" });
  }
};

export const getProductImages = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  const images = await prisma.productImage.findMany({ where: { productId } });
  res.json({ success: true, images });
};

export const updateProductImage = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { sequence } = req.body;
  let imageUrl: string | undefined;

  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "products/images");
    imageUrl = result.secure_url;
  }

  const updated = await prisma.productImage.update({
    where: { id },
    data: {
      image: imageUrl,
      sequence: sequence ? Number(sequence) : undefined,
    },
  });

  res.json({ success: true, productImage: updated });
};
