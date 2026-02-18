"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const orderItemSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
}, { _id: false });
const orderSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    status: {
        type: String,
        enum: ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
        default: 'PLACED',
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    appliedCouponCode: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    trackingId: { type: String, default: null },
    trackingUrl: { type: String, default: null },
}, { timestamps: true });
exports.Order = mongoose_1.default.model('Order', orderSchema);
