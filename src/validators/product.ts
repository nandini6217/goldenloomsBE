import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  category: z.enum(['RESIN', 'HANDLOOM']),
  price: z.number().positive(),
  discountedPrice: z.number().positive().optional().nullable(),
  expectedDeliveryTime: z.string().optional().default('7-10 days'),
  description: z.string().optional().default(''),
  images: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  stock: z.number().int().min(0).optional().default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(['RESIN', 'HANDLOOM']).optional(),
  sort: z.enum(['price_asc', 'price_desc']).optional(),
  featured: z.string().optional(),
  ids: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
