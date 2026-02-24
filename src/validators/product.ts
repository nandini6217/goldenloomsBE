import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  category: z.enum(['RESIN', 'HANDLOOM', 'OTHERS']),
  price: z.number().positive(),
  discountedPrice: z.number().positive().optional().nullable(),
  expectedDeliveryTime: z.string().optional().default('7-10 days'),
  description: z.string().optional().default(''),
  images: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  stock: z.number().int().min(0).optional().default(0),
  subcategory: z.enum(['HOME_DECOR', 'FASHION', 'SPIRITUAL', 'GIFTS', 'OTHERS']).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

function optionalQueryString() {
  return z.preprocess(
    (val) => (val == null || val === '' || (Array.isArray(val) && val.length === 0) ? undefined : Array.isArray(val) ? val[0] : val),
    z.string().optional()
  );
}

function optionalQueryEnum<T extends [string, ...string[]]>(values: T) {
  return z.preprocess(
    (val) => {
      const s = val == null || val === '' ? undefined : Array.isArray(val) ? val[0] : val;
      return typeof s === 'string' && values.includes(s) ? s : undefined;
    },
    z.enum(values).optional()
  );
}

export const productListQuerySchema = z.object({
  search: optionalQueryString(),
  category: optionalQueryEnum(['RESIN', 'HANDLOOM', 'OTHERS']),
  subcategory: optionalQueryEnum(['HOME_DECOR', 'FASHION', 'SPIRITUAL', 'GIFTS', 'OTHERS']),
  sort: optionalQueryEnum(['price_asc', 'price_desc', 'newest']),
  featured: optionalQueryString(),
  ids: optionalQueryString(),
  minPrice: optionalQueryString(),
  maxPrice: optionalQueryString(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
