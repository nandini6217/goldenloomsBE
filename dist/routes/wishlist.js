"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Wishlist_1 = require("../models/Wishlist");
const Product_1 = require("../models/Product");
const auth_1 = require("../middleware/auth");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// Get my wishlist (product IDs and optionally populated products)
router.get('/', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    const wishlist = await Wishlist_1.Wishlist.findOne({ userId }).lean();
    const productIds = (wishlist?.productIds || []);
    const products = await Product_1.Product.find({ _id: { $in: productIds } }).lean();
    res.json({ productIds: productIds.map((id) => id.toString()), products });
});
// Add product to wishlist
router.post('/', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : null;
    if (!productId || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
        res.status(400).json({ error: 'Valid productId required' });
        return;
    }
    const product = await Product_1.Product.findById(productId);
    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
    }
    const objId = new mongoose_1.default.Types.ObjectId(productId);
    const wishlist = await Wishlist_1.Wishlist.findOneAndUpdate({ userId: user.userId }, { $addToSet: { productIds: objId } }, { new: true, upsert: true });
    if (!wishlist) {
        res.status(500).json({ error: 'Failed to update wishlist' });
        return;
    }
    res.json({ productIds: (wishlist.productIds || []).map((id) => id.toString()) });
});
// Remove product from wishlist
router.delete('/:productId', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const user = req.user;
    const { productId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
    }
    const objId = new mongoose_1.default.Types.ObjectId(productId);
    await Wishlist_1.Wishlist.findOneAndUpdate({ userId: user.userId }, { $pull: { productIds: objId } }, { new: true });
    const wishlist = await Wishlist_1.Wishlist.findOne({ userId: user.userId }).lean();
    res.json({ productIds: (wishlist?.productIds || []).map((id) => id.toString()) });
});
exports.default = router;
