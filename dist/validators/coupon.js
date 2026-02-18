"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCouponSchema = exports.validateCouponSchema = void 0;
const zod_1 = require("zod");
exports.validateCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    total: zod_1.z.number().min(0),
});
exports.createCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    type: zod_1.z.enum(['PERCENTAGE', 'FIXED']),
    value: zod_1.z.number().min(0),
    minOrder: zod_1.z.number().min(0).optional(),
    validFrom: zod_1.z.string().optional(),
    validTo: zod_1.z.string().optional(),
    usageLimit: zod_1.z.number().int().min(0).optional(),
});
