import { Router, Request, Response } from 'express';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { authMiddleware, customerOnly, AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { z } from 'zod';

const router = Router();

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// Get featured reviews (5-star with comment) for homepage
router.get('/featured', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 6, 12);
  const reviews = await Review.find({ rating: 5 })
    .populate('userId', 'name')
    .populate('productId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 2) // fetch extra then filter by non-empty comment
    .lean();
  const withComment = reviews.filter((r) => r.comment && String(r.comment).trim().length > 0).slice(0, limit);
  type Populated = { userId?: { _id: unknown; name?: string }; productId?: { _id: unknown; name?: string } };
  const payload = withComment.map((r) => {
    const p = r as unknown as Populated;
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
router.get('/product/:productId', async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }
  const reviews = await Review.find({ productId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  type PopulatedUser = { userId?: { _id: unknown; name?: string; email?: string } };
  const withUser = reviews.map((r) => {
    const p = r as unknown as PopulatedUser;
    return {
      _id: r._id,
      productId: r.productId,
      userId: r.userId,
      user: p.userId ? { name: p.userId.name, email: p.userId.email } : null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      helpfulYes: (r as { helpfulYes?: number }).helpfulYes ?? 0,
      helpfulNo: (r as { helpfulNo?: number }).helpfulNo ?? 0,
    };
  });
  const stats = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
  const reviewCount = stats[0]?.count ?? 0;
  res.json({ reviews: withUser, avgRating, reviewCount });
});

// Create or update review (customer, one per product per user)
router.post('/product/:productId', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const user = (req as AuthenticatedRequest).user!;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    return;
  }
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const userId = new mongoose.Types.ObjectId(user.userId);
  const review = await Review.findOneAndUpdate(
    { productId, userId },
    { rating: parsed.data.rating, comment: parsed.data.comment ?? '' },
    { new: true, upsert: true }
  ).lean();
  res.status(201).json(review);
});

// Mark review as helpful (public, optional auth)
router.post('/:reviewId/helpful', async (req: Request, res: Response): Promise<void> => {
  const { reviewId } = req.params;
  const helpful = req.body?.helpful === true;
  const unhelpful = req.body?.helpful === false;
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    res.status(400).json({ error: 'Invalid review ID' });
    return;
  }
  const update = helpful ? { $inc: { helpfulYes: 1 } } : unhelpful ? { $inc: { helpfulNo: 1 } } : null;
  if (!update) {
    res.status(400).json({ error: 'Send { helpful: true } or { helpful: false }' });
    return;
  }
  const review = await Review.findByIdAndUpdate(reviewId, update, { new: true }).lean();
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  res.json({
    helpfulYes: (review as { helpfulYes?: number }).helpfulYes ?? 0,
    helpfulNo: (review as { helpfulNo?: number }).helpfulNo ?? 0,
  });
});

export default router;
