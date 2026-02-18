"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatusSchema = exports.createOrderBodySchema = exports.orderItemSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.orderItemSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, "Product ID is required"),
    qty: zod_1.z.number().int().positive("Quantity must be positive"),
});
exports.createOrderBodySchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1, "Customer name is required"),
    phone: zod_1.z.string().min(1, "Phone is required"),
    email: zod_1.z.string().email("Invalid email"),
    address: zod_1.z.string().min(1, "Address is required"),
    items: zod_1.z.array(exports.orderItemSchema).min(1, "At least one item is required"),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.OrderStatus),
});
