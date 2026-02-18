"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productQuerySchema = exports.updateProductBodySchema = exports.createProductBodySchema = exports.productCategorySchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.productCategorySchema = zod_1.z.nativeEnum(client_1.ProductCategory);
exports.createProductBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    slug: zod_1.z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens"),
    category: exports.productCategorySchema,
    price: zod_1.z.number().positive("Price must be positive"),
    description: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string().url()).default([]),
    isFeatured: zod_1.z.boolean().default(false),
    stock: zod_1.z.number().int().min(0).default(0),
});
exports.updateProductBodySchema = exports.createProductBodySchema.partial();
exports.productQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    category: exports.productCategorySchema.optional(),
    sort: zod_1.z.enum(["price_asc", "price_desc"]).optional(),
});
