"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const reviewSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    helpfulYes: { type: Number, default: 0 },
    helpfulNo: { type: Number, default: 0 },
}, { timestamps: true });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
exports.Review = mongoose_1.default.model('Review', reviewSchema);
