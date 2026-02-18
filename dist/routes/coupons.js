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
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
const couponService = __importStar(require("../services/couponService"));
const coupon_1 = require("../validators/coupon");
const router = (0, express_1.Router)();
router.post('/validate', (0, validate_1.validateBody)(coupon_1.validateCouponSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req
        .validatedBody;
    const result = await couponService.validateCoupon(data.code, data.total);
    (0, apiResponse_1.success)(res, result);
}));
router.post('/', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateBody)(coupon_1.createCouponSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req
        .validatedBody;
    const coupon = await couponService.createCoupon(data);
    (0, apiResponse_1.success)(res, coupon, 201);
}));
router.get('/', auth_1.authMiddleware, auth_1.adminOnly, (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const coupons = await couponService.listCoupons();
    (0, apiResponse_1.success)(res, coupons);
}));
router.get('/:id', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateParamId)('id'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const coupon = await couponService.getCouponById(req.params.id);
    (0, apiResponse_1.success)(res, coupon);
}));
router.put('/:id', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateParamId)('id'), (0, validate_1.validateBody)(coupon_1.createCouponSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const data = req
        .validatedBody;
    const coupon = await couponService.updateCoupon(id, data);
    (0, apiResponse_1.success)(res, coupon);
}));
router.delete('/:id', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateParamId)('id'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await couponService.deleteCoupon(req.params.id);
    res.status(204).send();
}));
exports.default = router;
