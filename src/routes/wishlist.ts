import { Router, Request, Response } from 'express';
import { Wishlist } from '../models/Wishlist';
import { Product } from '../models/Product';
import { authMiddleware, customerOnly, AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

// Get my wishlist (product IDs and optionally populated products)
router.get('/', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const userId = user.userId!;
  const wishlist = await Wishlist.findOne({ userId }).lean();
  const productIds = (wishlist?.productIds || []) as mongoose.Types.ObjectId[];
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  res.json({ productIds: productIds.map((id) => id.toString()), products });
});

// Add product to wishlist
router.post('/', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : null;
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: 'Valid productId required' });
    return;
  }
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const objId = new mongoose.Types.ObjectId(productId);
  const wishlist = await Wishlist.findOneAndUpdate(
    { userId: user.userId },
    { $addToSet: { productIds: objId } },
    { new: true, upsert: true }
  );
  if (!wishlist) {
    res.status(500).json({ error: 'Failed to update wishlist' });
    return;
  }
  res.json({ productIds: (wishlist.productIds || []).map((id: mongoose.Types.ObjectId) => id.toString()) });
});

// Remove product from wishlist
router.delete('/:productId', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }
  const objId = new mongoose.Types.ObjectId(productId);
  await Wishlist.findOneAndUpdate(
    { userId: user.userId },
    { $pull: { productIds: objId } },
    { new: true }
  );
  const wishlist = await Wishlist.findOne({ userId: user.userId }).lean();
  res.json({ productIds: (wishlist?.productIds || []).map((id: mongoose.Types.ObjectId) => id.toString()) });
});

export default router;
