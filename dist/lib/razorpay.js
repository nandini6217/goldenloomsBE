"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRazorpayClient = getRazorpayClient;
exports.getRazorpayKeyId = getRazorpayKeyId;
exports.createRazorpayOrder = createRazorpayOrder;
const razorpay_1 = __importDefault(require("razorpay"));
const config_1 = require("../config");
let client = null;
if (config_1.config.razorpay.keyId && config_1.config.razorpay.keySecret) {
    client = new razorpay_1.default({
        key_id: config_1.config.razorpay.keyId,
        key_secret: config_1.config.razorpay.keySecret,
    });
}
function getRazorpayClient() {
    return client;
}
function getRazorpayKeyId() {
    return config_1.config.razorpay.keyId || null;
}
async function createRazorpayOrder(amountPaise, orderId) {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
        throw new Error('Payment service unavailable');
    }
    const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        notes: { orderId },
    });
    return { id: order.id };
}
