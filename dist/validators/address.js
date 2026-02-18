"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAddressSchema = exports.createAddressSchema = void 0;
const zod_1 = require("zod");
exports.createAddressSchema = zod_1.z.object({
    label: zod_1.z.string().optional().default('Home'),
    name: zod_1.z.string().min(1, 'Name is required'),
    phone: zod_1.z.string().min(1, 'Phone is required'),
    addressLine1: zod_1.z.string().min(1, 'Address line 1 is required'),
    addressLine2: zod_1.z.string().optional().default(''),
    city: zod_1.z.string().min(1, 'City is required'),
    state: zod_1.z.string().min(1, 'State is required'),
    pincode: zod_1.z.string().min(1, 'Pincode is required'),
    isDefault: zod_1.z.boolean().optional().default(false),
});
exports.updateAddressSchema = exports.createAddressSchema.partial();
