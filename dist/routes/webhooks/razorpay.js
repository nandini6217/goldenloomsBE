"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../../config");
const Order_1 = require("../../models/Order");
const WebhookEvent_1 = require("../../models/WebhookEvent");
const router = (0, express_1.Router)();
function verifySignature(rawBody, signature) {
    const secret = config_1.config.razorpay.webhookSecret;
    if (!secret)
        return false;
    const expected = crypto_1.default.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected.length !== signature.length)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
router.post('/', async (req, res) => {
    const rawBody = req.body;
    const signature = req.headers['x-razorpay-signature'] || '';
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
        res.status(400).json({ error: 'Invalid body' });
        return;
    }
    if (!verifySignature(rawBody, signature)) {
        res.status(400).json({ error: 'Invalid signature' });
        return;
    }
    let payload;
    try {
        payload = JSON.parse(rawBody.toString());
    }
    catch {
        res.status(400).json({ error: 'Invalid JSON' });
        return;
    }
    const entity = payload.payload?.payment?.entity;
    const idempotencyKey = entity?.id ?? `razorpay_${payload.event}_${entity?.order_id ?? ''}_${crypto_1.default.createHash('sha256').update(rawBody).digest('hex').slice(0, 24)}`;
    try {
        await WebhookEvent_1.WebhookEvent.create({ eventId: idempotencyKey, source: 'razorpay' });
    }
    catch (err) {
        if (err.code === 11000) {
            res.status(200).send('OK');
            return;
        }
        throw err;
    }
    const event = payload.event;
    if (event === 'payment.captured' && entity?.order_id) {
        const razorpayOrderId = entity.order_id;
        const razorpayPaymentId = entity.id || undefined;
        const order = await Order_1.Order.findOne({ razorpayOrderId });
        if (order) {
            await Order_1.Order.findByIdAndUpdate(order._id, {
                status: 'CONFIRMED',
                razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId,
            });
        }
    }
    if (event === 'payment.failed' && entity?.order_id) {
        // Leave order as PLACED; customer can retry payment
    }
    res.status(200).send('OK');
});
exports.default = router;
