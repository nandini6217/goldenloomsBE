"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productListQuerySchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1).regex(/^[a-z0-9-]+$/),
    category: zod_1.z.enum(['RESIN', 'HANDLOOM']),
    price: zod_1.z.number().positive(),
    discountedPrice: zod_1.z.number().positive().optional().nullable(),
    expectedDeliveryTime: zod_1.z.string().optional().default('7-10 days'),
    description: zod_1.z.string().optional().default(''),
    images: zod_1.z.array(zod_1.z.string()).optional().default([]),
    isFeatured: zod_1.z.boolean().optional().default(false),
    stock: zod_1.z.number().int().min(0).optional().default(0),
});
exports.updateProductSchema = exports.createProductSchema.partial();
exports.productListQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    category: zod_1.z.enum(['RESIN', 'HANDLOOM']).optional(),
    sort: zod_1.z.enum(['price_asc', 'price_desc']).optional(),
    featured: zod_1.z.string().optional(),
    ids: zod_1.z.string().optional(),
    minPrice: zod_1.z.string().optional(),
    maxPrice: zod_1.z.string().optional(),
});
