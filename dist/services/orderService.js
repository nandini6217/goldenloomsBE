"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeGuestOrdersToUser = mergeGuestOrdersToUser;
exports.createOrder = createOrder;
exports.createRazorpayOrderForOrder = createRazorpayOrderForOrder;
exports.getMyOrders = getMyOrders;
exports.getOrderById = getOrderById;
exports.listOrdersAdmin = listOrdersAdmin;
exports.bulkUpdateStatus = bulkUpdateStatus;
exports.updateOrderStatus = updateOrderStatus;
exports.cancelOrder = cancelOrder;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = require("../models/Order");
const Product_1 = require("../models/Product");
const notifications_1 = require("../lib/notifications");
const razorpay_1 = require("../lib/razorpay");
const couponService = __importStar(require("./couponService"));
const errorHandler_1 = require("../middleware/errorHandler");
/** Merge guest orders (same email, no userId) to the given user. */
async function mergeGuestOrdersToUser(userId, email) {
    const normalizedEmail = email.trim().toLowerCase();
    const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await Order_1.Order.updateMany({ userId: null, email: new RegExp(`^${escaped}$`, 'i') }, { $set: { userId: new mongoose_1.default.Types.ObjectId(userId) } });
}
async function createOrder(data, userId) {
    const { customerName, phone, email, address, items, couponCode } = data;
    const orderItems = [];
    let totalAmount = 0;
    for (const item of items) {
        if (!mongoose_1.default.Types.ObjectId.isValid(item.productId)) {
            throw new errorHandler_1.AppError(400, `Invalid product ID: ${item.productId}`);
        }
        const product = await Product_1.Product.findById(item.productId);
        if (!product)
            throw new errorHandler_1.AppError(404, `Product not found: ${item.productId}`);
        if (product.stock < item.qty) {
            throw new errorHandler_1.AppError(400, `Insufficient stock for ${product.name}`);
        }
        const lineTotal = product.price * item.qty;
        totalAmount += lineTotal;
        orderItems.push({
            productId: product._id,
            name: product.name,
            qty: item.qty,
            priceAtPurchase: product.price,
        });
    }
    let discountAmount = 0;
    let appliedCouponCode;
    if (couponCode?.trim()) {
        const result = await couponService.applyCoupon(couponCode.trim(), totalAmount);
        if (result) {
            discountAmount = result.discount;
            totalAmount = result.finalTotal;
            appliedCouponCode = couponCode.trim().toUpperCase();
        }
    }
    const order = await Order_1.Order.create({
        userId: userId ? new mongoose_1.default.Types.ObjectId(userId) : null,
        customerName,
        phone,
        email,
        address,
        items: orderItems,
        totalAmount,
        discountAmount,
        appliedCouponCode: appliedCouponCode ?? undefined,
    });
    for (const item of orderItems) {
        await Product_1.Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
    }
    if (appliedCouponCode) {
        await couponService.incrementCouponUsage(appliedCouponCode);
    }
    (0, notifications_1.notifyOrderPlaced)({
        _id: order._id.toString(),
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        status: order.status,
        totalAmount: order.totalAmount,
    }).catch(() => { });
    return { orderId: order._id.toString() };
}
async function createRazorpayOrderForOrder(orderId, context) {
    const order = await Order_1.Order.findById(orderId).lean();
    if (!order)
        throw new errorHandler_1.AppError(404, 'Order not found');
    const orderUserId = order.userId?.toString();
    if (context.role === 'customer') {
        if (orderUserId !== context.userId)
            throw new errorHandler_1.AppError(404, 'Order not found');
    }
    else if (context.role === 'guest') {
        if (orderUserId != null)
            throw new errorHandler_1.AppError(404, 'Order not found');
    }
    const keyId = (0, razorpay_1.getRazorpayKeyId)();
    if (!keyId)
        throw new errorHandler_1.AppError(503, 'Payment service unavailable');
    const existingRazorpayOrderId = order.razorpayOrderId;
    if (existingRazorpayOrderId) {
        return { razorpayOrderId: existingRazorpayOrderId, keyId };
    }
    const amountPaise = Math.round(Number(order.totalAmount) * 100);
    if (amountPaise < 100)
        throw new errorHandler_1.AppError(400, 'Order amount too low');
    try {
        const razorpayOrder = await (0, razorpay_1.createRazorpayOrder)(amountPaise, orderId);
        await Order_1.Order.findByIdAndUpdate(orderId, { razorpayOrderId: razorpayOrder.id });
        return { razorpayOrderId: razorpayOrder.id, keyId };
    }
    catch {
        throw new errorHandler_1.AppError(502, 'Could not create payment order');
    }
}
async function getMyOrders(context) {
    const escaped = (context.email || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Order_1.Order.find({
        $or: [
            { userId: context.userId },
            { userId: null, email: new RegExp(`^${escaped}$`, 'i') },
        ],
    })
        .sort({ createdAt: -1 })
        .lean();
}
async function getOrderById(orderId, context) {
    const order = await Order_1.Order.findById(orderId).lean();
    if (!order)
        throw new errorHandler_1.AppError(404, 'Order not found');
    const orderUserId = order.userId?.toString();
    if (context.role === 'admin') {
        return order;
    }
    if (context.role === 'customer') {
        if (orderUserId !== context.userId)
            throw new errorHandler_1.AppError(404, 'Order not found');
        return order;
    }
    if (orderUserId != null)
        throw new errorHandler_1.AppError(404, 'Order not found');
    return order;
}
async function listOrdersAdmin() {
    return Order_1.Order.find().sort({ createdAt: -1 }).lean();
}
async function bulkUpdateStatus(orderIds, status) {
    const validIds = orderIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
    if (validIds.length === 0)
        throw new errorHandler_1.AppError(400, 'No valid order IDs');
    const result = await Order_1.Order.updateMany({ _id: { $in: validIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) } }, { status });
    return { updated: result.modifiedCount ?? 0, status };
}
async function updateOrderStatus(orderId, data) {
    const update = {
        status: data.status,
    };
    if (data.trackingId !== undefined)
        update.trackingId = data.trackingId || null;
    if (data.trackingUrl !== undefined)
        update.trackingUrl = data.trackingUrl || null;
    const order = await Order_1.Order.findByIdAndUpdate(orderId, update, { new: true });
    if (!order)
        throw new errorHandler_1.AppError(404, 'Order not found');
    (0, notifications_1.notifyOrderStatusUpdated)({
        _id: order._id.toString(),
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        status: order.status,
        totalAmount: order.totalAmount,
    }).catch(() => { });
    return order;
}
async function cancelOrder(orderId, userId) {
    const order = await Order_1.Order.findById(orderId);
    if (!order)
        throw new errorHandler_1.AppError(404, 'Order not found');
    if (order.userId?.toString() !== userId)
        throw new errorHandler_1.AppError(404, 'Order not found');
    if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
        throw new errorHandler_1.AppError(400, 'Order can no longer be cancelled');
    }
    const updated = await Order_1.Order.findByIdAndUpdate(orderId, { status: 'CANCELLED' }, { new: true }).lean();
    return updated;
}
