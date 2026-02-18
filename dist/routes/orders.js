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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_1 = require("../validators/order");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
const orderService = __importStar(require("../services/orderService"));
const router = (0, express_1.Router)();
function getOrderAccessContext(req) {
    const user = req.user;
    if (user?.role === 'admin')
        return { role: 'admin' };
    if (user?.role === 'customer' && user.userId)
        return { role: 'customer', userId: user.userId, email: user.email };
    return { role: 'guest' };
}
router.post('/', auth_1.optionalAuth, (0, validate_1.validateBody)(order_1.createOrderSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req.validatedBody;
    const user = req.user;
    const userId = user?.role === 'customer' && user.userId ? user.userId : null;
    const result = await orderService.createOrder(data, userId);
    (0, apiResponse_1.success)(res, { orderId: result.orderId }, 201);
}));
router.post('/:id/create-razorpay-order', auth_1.optionalAuth, (0, validate_1.validateParamId)('id'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orderId = req.params.id;
    const context = getOrderAccessContext(req);
    const result = await orderService.createRazorpayOrderForOrder(orderId, context);
    (0, apiResponse_1.success)(res, result);
}));
router.get('/me', auth_1.authMiddleware, auth_1.customerOnly, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const orders = await orderService.getMyOrders({ userId: user.userId, email: user.email || '' });
    (0, apiResponse_1.success)(res, orders);
}));
router.get('/', auth_1.authMiddleware, auth_1.adminOnly, (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const orders = await orderService.listOrdersAdmin();
    (0, apiResponse_1.success)(res, orders);
}));
router.get('/:id', auth_1.optionalAuth, (0, validate_1.validateParamId)('id'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orderId = req.params.id;
    const context = getOrderAccessContext(req);
    const order = await orderService.getOrderById(orderId, context);
    (0, apiResponse_1.success)(res, order);
}));
router.put('/bulk-status', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateBody)(order_1.bulkUpdateOrderStatusSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req
        .validatedBody;
    const result = await orderService.bulkUpdateStatus(data.orderIds, data.status);
    (0, apiResponse_1.success)(res, result);
}));
router.put('/:id/status', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateParamId)('id'), (0, validate_1.validateBody)(order_1.updateOrderStatusSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orderId = req.params.id;
    const data = req.validatedBody;
    const order = await orderService.updateOrderStatus(orderId, data);
    (0, apiResponse_1.success)(res, order);
}));
router.patch('/:id/cancel', auth_1.authMiddleware, auth_1.customerOnly, (0, validate_1.validateParamId)('id'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orderId = req.params.id;
    const user = req.user;
    const order = await orderService.cancelOrder(orderId, user.userId);
    (0, apiResponse_1.success)(res, order);
}));
exports.default = router;
