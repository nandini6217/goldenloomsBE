"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Review_1 = require("../models/Review");
const Product_1 = require("../models/Product");
const auth_1 = require("../middleware/auth");
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const createReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(2000).optional(),
});
// Get featured reviews (5-star with comment) for homepage
router.get('/featured', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);
    const reviews = await Review_1.Review.find({ rating: 5 })
        .populate('userId', 'name')
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit * 2) // fetch extra then filter by non-empty comment
        .lean();
    const withComment = reviews.filter((r) => r.comment && String(r.comment).trim().length > 0).slice(0, limit);
    const payload = withComment.map((r) => {
        const p = r;
        return {
            _id: r._id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: p.userId ? { name: p.userId.name ?? 'Customer' } : { name: 'Customer' },
            product: p.productId ? { _id: String(p.productId._id), name: p.productId.name ?? '' } : null,
        };
    });
    res.json({ reviews: payload });
});
// Get reviews for a product (public)
router.get('/product/:productId', async (req, res) => {
    const { productId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
    }
    const reviews = await Review_1.Review.find({ productId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .lean();
    const withUser = reviews.map((r) => {
        const p = r;
        return {
            _id: r._id,
            productId: r.productId,
            userId: r.userId,
            user: p.userId ? { name: p.userId.name, email: p.userId.email } : null,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            helpfulYes: r.helpfulYes ?? 0,
            helpfulNo: r.helpfulNo ?? 0,
        };
    });
    const stats = await Review_1.Review.aggregate([
        { $match: { productId: new mongoose_1.default.Types.ObjectId(productId) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avgRating = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
    const reviewCount = stats[0]?.count ?? 0;
    res.json({ reviews: withUser, avgRating, reviewCount });
});
// Create or update review (customer, one per product per user)
router.post('/product/:productId', auth_1.authMiddleware, auth_1.customerOnly, async (req, res) => {
    const { productId } = req.params;
    const user = req.user;
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
    }
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
        return;
    }
    const product = await Product_1.Product.findById(productId);
    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
    }
    const userId = new mongoose_1.default.Types.ObjectId(user.userId);
    const review = await Review_1.Review.findOneAndUpdate({ productId, userId }, { rating: parsed.data.rating, comment: parsed.data.comment ?? '' }, { new: true, upsert: true }).lean();
    res.status(201).json(review);
});
// Mark review as helpful (public, optional auth)
router.post('/:reviewId/helpful', async (req, res) => {
    const { reviewId } = req.params;
    const helpful = req.body?.helpful === true;
    const unhelpful = req.body?.helpful === false;
    if (!mongoose_1.default.Types.ObjectId.isValid(reviewId)) {
        res.status(400).json({ error: 'Invalid review ID' });
        return;
    }
    const update = helpful ? { $inc: { helpfulYes: 1 } } : unhelpful ? { $inc: { helpfulNo: 1 } } : null;
    if (!update) {
        res.status(400).json({ error: 'Send { helpful: true } or { helpful: false }' });
        return;
    }
    const review = await Review_1.Review.findByIdAndUpdate(reviewId, update, { new: true }).lean();
    if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
    }
    res.json({
        helpfulYes: review.helpfulYes ?? 0,
        helpfulNo: review.helpfulNo ?? 0,
    });
});
exports.default = router;
