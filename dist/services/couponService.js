"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCoupon = applyCoupon;
exports.incrementCouponUsage = incrementCouponUsage;
exports.validateCoupon = validateCoupon;
exports.listCoupons = listCoupons;
exports.getCouponById = getCouponById;
exports.createCoupon = createCoupon;
exports.updateCoupon = updateCoupon;
exports.deleteCoupon = deleteCoupon;
const Coupon_1 = require("../models/Coupon");
const errorHandler_1 = require("../middleware/errorHandler");
/** Apply coupon to subtotal. Returns { discount, finalTotal } or null if invalid. */
async function applyCoupon(code, subtotal) {
    const coupon = await Coupon_1.Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon)
        return null;
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom)
        return null;
    if (coupon.validTo && now > coupon.validTo)
        return null;
    if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit)
        return null;
    if (subtotal < (coupon.minOrder ?? 0))
        return null;
    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
        discount = Math.min((subtotal * coupon.value) / 100, subtotal);
    }
    else {
        discount = Math.min(coupon.value, subtotal);
    }
    return {
        discount: Math.round(discount * 100) / 100,
        finalTotal: Math.max(0, Math.round((subtotal - discount) * 100) / 100),
    };
}
async function incrementCouponUsage(code) {
    await Coupon_1.Coupon.findOneAndUpdate({ code: code.trim().toUpperCase() }, { $inc: { usedCount: 1 } });
}
/** Validate coupon for checkout UI; returns structured response. */
async function validateCoupon(code, total) {
    const coupon = await Coupon_1.Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon) {
        return { valid: false, message: 'Invalid coupon code', discount: 0, finalTotal: total };
    }
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
        return { valid: false, message: 'Coupon not yet valid', discount: 0, finalTotal: total };
    }
    if (coupon.validTo && now > coupon.validTo) {
        return { valid: false, message: 'Coupon has expired', discount: 0, finalTotal: total };
    }
    if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
        return { valid: false, message: 'Coupon usage limit reached', discount: 0, finalTotal: total };
    }
    if (total < (coupon.minOrder ?? 0)) {
        return {
            valid: false,
            message: `Minimum order amount is ₹${coupon.minOrder}`,
            discount: 0,
            finalTotal: total,
        };
    }
    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
        discount = Math.min((total * coupon.value) / 100, total);
    }
    else {
        discount = Math.min(coupon.value, total);
    }
    const finalTotal = Math.max(0, total - discount);
    return {
        valid: true,
        message: 'Coupon applied',
        discount: Math.round(discount * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
    };
}
async function listCoupons() {
    return Coupon_1.Coupon.find().sort({ createdAt: -1 }).lean();
}
async function getCouponById(id) {
    const coupon = await Coupon_1.Coupon.findById(id).lean();
    if (!coupon)
        throw new errorHandler_1.AppError(404, 'Coupon not found');
    return coupon;
}
async function createCoupon(data) {
    const code = data.code.trim().toUpperCase();
    const existing = await Coupon_1.Coupon.findOne({ code });
    if (existing)
        throw new errorHandler_1.AppError(409, 'Coupon code already exists');
    const coupon = await Coupon_1.Coupon.create({
        code,
        type: data.type,
        value: data.value,
        minOrder: data.minOrder ?? 0,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        usageLimit: data.usageLimit ?? null,
    });
    return coupon;
}
async function updateCoupon(id, data) {
    const coupon = await Coupon_1.Coupon.findById(id);
    if (!coupon)
        throw new errorHandler_1.AppError(404, 'Coupon not found');
    const code = data.code.trim().toUpperCase();
    if (code !== coupon.code) {
        const duplicate = await Coupon_1.Coupon.findOne({ code });
        if (duplicate)
            throw new errorHandler_1.AppError(409, 'Coupon code already exists');
    }
    coupon.code = code;
    coupon.type = data.type;
    coupon.value = data.value;
    coupon.minOrder = data.minOrder ?? 0;
    coupon.validFrom = data.validFrom ? new Date(data.validFrom) : null;
    coupon.validTo = data.validTo ? new Date(data.validTo) : null;
    coupon.usageLimit = data.usageLimit ?? null;
    await coupon.save();
    return coupon;
}
async function deleteCoupon(id) {
    const deleted = await Coupon_1.Coupon.findByIdAndDelete(id);
    if (!deleted)
        throw new errorHandler_1.AppError(404, 'Coupon not found');
}
