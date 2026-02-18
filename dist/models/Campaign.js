"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Campaign = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const campaignSchema = new mongoose_1.default.Schema({
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    bannerImage: { type: String, default: null },
    productIds: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product' }],
    couponCode: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.Campaign = mongoose_1.default.model('Campaign', campaignSchema);
