"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const productSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true, enum: ['RESIN', 'HANDLOOM'] },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: null },
    expectedDeliveryTime: { type: String, default: '7-10 days' },
    description: { type: String, default: '' },
    images: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
}, { timestamps: true });
exports.Product = mongoose_1.default.model('Product', productSchema);
