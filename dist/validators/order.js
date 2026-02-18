"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateOrderStatusSchema = exports.updateOrderStatusSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    address: zod_1.z.string().min(1),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string(),
        qty: zod_1.z.number().int().min(1),
    })).min(1),
    couponCode: zod_1.z.string().optional(),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    trackingId: zod_1.z.string().optional(),
    trackingUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
});
exports.bulkUpdateOrderStatusSchema = zod_1.z.object({
    orderIds: zod_1.z.array(zod_1.z.string()).min(1, 'Select at least one order'),
    status: zod_1.z.enum(['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});
