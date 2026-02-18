"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coupon = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const couponSchema = new mongoose_1.default.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, required: true, enum: ['PERCENTAGE', 'FIXED'] },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
}, { timestamps: true });
exports.Coupon = mongoose_1.default.model('Coupon', couponSchema);
