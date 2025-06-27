import prisma from "../db/prisma";

export const generateSlug = async (
  name: string,
  SKU: string
): Promise<string> => {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-alphanumeric characters
    .replace(/\s+/g, "-"); // Replace spaces with dashes

  let slug = baseSlug;

  while (true) {
    const exists = await prisma.product.findFirst({
      where: { slug },
    });

    if (!exists) break;

    slug = `${baseSlug}-${SKU}`;
  }

  return slug;
};
