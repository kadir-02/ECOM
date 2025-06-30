type OrderType = 
  | { sellingPrice : 'asc' | 'desc' }
  | { createdAt: 'asc' | 'desc' };

export function buildProductQuery(query: any) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const search = query.search || '';
  const sort = query.sort;

  const categoryId = parseInt(query.category);
  const subcategoryId = parseInt(query.subcategory);
  const minPrice = parseFloat(query.min);
  const maxPrice = parseFloat(query.max);

  const where: any = {
    isDeleted: false,
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { name: { contains: search, mode: 'insensitive' } } },
      { subcategory: { name: { contains: search, mode: 'insensitive' } } },
    ],
  };

  if (!isNaN(categoryId)) where.categoryId = categoryId;
  if (!isNaN(subcategoryId)) where.subcategoryId = subcategoryId;

  if (!isNaN(minPrice) || !isNaN(maxPrice)) {
    where.sellingPrice  = {};
    if (!isNaN(minPrice)) where.sellingPrice.gte = minPrice;
    if (!isNaN(maxPrice)) where.sellingPrice.lte = maxPrice;
  }

  let orderBy: OrderType = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { sellingPrice : 'asc' };
  if (sort === 'price_desc') orderBy = { sellingPrice : 'desc' };

  return { where, orderBy, skip, limit, page };
}