"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatbotLeadSchema = void 0;
const zod_1 = require("zod");
exports.createChatbotLeadSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100),
    phone: zod_1.z.string().min(1, 'Phone is required').max(20),
    productTypeRequired: zod_1.z.string().min(1, 'Product type is required').max(200),
    message: zod_1.z.string().max(1000).optional(),
});
