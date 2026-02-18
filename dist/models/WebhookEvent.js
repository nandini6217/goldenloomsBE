"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEvent = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const webhookEventSchema = new mongoose_1.default.Schema({
    eventId: { type: String, required: true, unique: true },
    source: { type: String, required: true, default: 'razorpay' },
    processedAt: { type: Date, default: Date.now },
}, { timestamps: true });
// TTL: delete documents after 7 days to avoid unbounded growth
webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
exports.WebhookEvent = mongoose_1.default.model('WebhookEvent', webhookEventSchema);
