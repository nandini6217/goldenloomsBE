import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Review } from '../models/Review';
import { AppError } from '../middleware/errorHandler';
import type { CreateProductBody, UpdateProductBody } from '../validators/product';

export interface ProductListQuery {
  search?: string;
  category?: 'RESIN' | 'HANDLOOM';
  sort?: 'price_asc' | 'price_desc';
  featured?: string;
  ids?: string;
  minPrice?: string;
  maxPrice?: string;
}

export interface ProductWithRating {
  _id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  discountedPrice?: number | null;
  expectedDeliveryTime?: string;
  description?: string;
  images?: string[];
  isFeatured?: boolean;
  stock?: number;
  avgRating: number;
  reviewCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function listProducts(query: ProductListQuery): Promise<ProductWithRating[]> {
  const filter: Record<string, unknown> = {};
  if (typeof query.search === 'string' && query.search.trim()) {
    filter.$or = [
      { name: new RegExp(query.search.trim(), 'i') },
      { description: new RegExp(query.search.trim(), 'i') },
    ];
  }
  if (query.category === 'RESIN' || query.category === 'HANDLOOM') filter.category = query.category;
  if (query.featured === 'true') filter.isFeatured = true;
  if (typeof query.ids === 'string' && query.ids.trim()) {
    const idList = query.ids
      .split(',')
      .map((s) => s.trim())
      .filter((s) => mongoose.Types.ObjectId.isValid(s));
    if (idList.length > 0) {
      filter._id = { $in: idList.map((id) => new mongoose.Types.ObjectId(id)) };
    }
  }
  const min = typeof query.minPrice === 'string' && query.minPrice.trim() ? Number(query.minPrice) : NaN;
  const max = typeof query.maxPrice === 'string' && query.maxPrice.trim() ? Number(query.maxPrice) : NaN;
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    const priceCond: Record<string, number> = {};
    if (!Number.isNaN(min) && min >= 0) priceCond.$gte = min;
    if (!Number.isNaN(max) && max >= 0) priceCond.$lte = max;
    if (Object.keys(priceCond).length > 0) filter.price = priceCond;
  }

  let q = Product.find(filter);
  if (query.sort === 'price_asc') q = q.sort({ price: 1 });
  else if (query.sort === 'price_desc') q = q.sort({ price: -1 });
  const products = await q.lean();
  const ids = (products as { _id: mongoose.Types.ObjectId }[]).map((p) => p._id);
  const ratingStats = await Review.aggregate([
    { $match: { productId: { $in: ids } } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const ratingMap: Record<string, { avgRating: number; reviewCount: number }> = {};
  for (const s of ratingStats) {
    ratingMap[s._id.toString()] = {
      avgRating: Math.round(s.avg * 10) / 10,
      reviewCount: s.count,
    };
  }
  return (products as { _id: mongoose.Types.ObjectId }[]).map((p) => ({
    ...p,
    _id: p._id.toString(),
    avgRating: ratingMap[p._id.toString()]?.avgRating ?? 0,
    reviewCount: ratingMap[p._id.toString()]?.reviewCount ?? 0,
  })) as ProductWithRating[];
}

export async function getProductById(id: string): Promise<ProductWithRating> {
  const product = await Product.findById(id).lean();
  if (!product) throw new AppError(404, 'Product not found');
  const stats = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(id) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
  const reviewCount = stats[0]?.count ?? 0;
  return {
    ...product,
    _id: (product as { _id: mongoose.Types.ObjectId })._id.toString(),
    avgRating,
    reviewCount,
  } as ProductWithRating;
}

export async function createProduct(data: CreateProductBody): Promise<unknown> {
  const existing = await Product.findOne({ slug: data.slug });
  if (existing) throw new AppError(409, 'Product with this slug already exists');
  return Product.create(data);
}

export async function updateProduct(id: string, data: UpdateProductBody): Promise<unknown> {
  if (data.slug) {
    const existing = await Product.findOne({ slug: data.slug, _id: { $ne: id } });
    if (existing) throw new AppError(409, 'Product with this slug already exists');
  }
  const product = await Product.findByIdAndUpdate(id, data, { new: true });
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new AppError(404, 'Product not found');
}
