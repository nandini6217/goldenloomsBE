import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Campaign } from '../models/Campaign';
import { Product } from '../models/Product';
import { Review } from '../models/Review';
import { authMiddleware, adminOnly, optionalAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const now = () => new Date();

function isActiveCampaign(c: { isActive: boolean; startDate?: Date | null; endDate?: Date | null }): boolean {
  if (!c.isActive) return false;
  const t = now();
  if (c.startDate && t < c.startDate) return false;
  if (c.endDate && t > c.endDate) return false;
  return true;
}

const createCampaignSchema = z.object({
  slug: z.string().min(1).transform((s) => s.trim().toLowerCase()),
  name: z.string().min(1),
  description: z.string().optional(),
  bannerImage: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  couponCode: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

/** List campaigns: public = active only */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const all = await Campaign.find({ isActive: true }).lean();
  const active = all.filter((c) => isActiveCampaign(c));
  res.json(active);
});

/** Admin: list all campaigns (for admin UI) */
router.get('/all', authMiddleware, adminOnly, async (_req: Request, res: Response): Promise<void> => {
  const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
  res.json(campaigns);
});

type CampaignLean = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  productIds: mongoose.Types.ObjectId[];
  [k: string]: unknown;
};

/** Get campaign by slug (public: returns campaign + products) or by id (admin with auth, for edit). */
router.get('/:slugOrId', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const { slugOrId } = req.params;
  const isAdmin = (req as AuthenticatedRequest).user?.role === 'admin';
  let campaign: CampaignLean | null = null;
  if (mongoose.Types.ObjectId.isValid(slugOrId) && slugOrId.length === 24 && isAdmin) {
    campaign = await Campaign.findById(slugOrId).lean() as CampaignLean | null;
  }
  if (!campaign) {
    campaign = await Campaign.findOne({ slug: slugOrId }).lean() as CampaignLean | null;
  }
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }
  const ids = campaign.productIds ?? [];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const orderMap = new Map<string, number>(ids.map((id: mongoose.Types.ObjectId, i: number) => [id.toString(), i]));
  const sorted = (products as { _id: mongoose.Types.ObjectId }[])
    .slice()
    .sort((a, b) => (orderMap.get(a._id.toString()) ?? 999) - (orderMap.get(b._id.toString()) ?? 999));
  const productIdList = (sorted as { _id: mongoose.Types.ObjectId }[]).map((p) => p._id);
  const ratingStats = await Review.aggregate([
    { $match: { productId: { $in: productIdList } } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const ratingMap: Record<string, { avgRating: number; reviewCount: number }> = {};
  for (const s of ratingStats) {
    ratingMap[s._id.toString()] = {
      avgRating: Math.round(s.avg * 10) / 10,
      reviewCount: s.count,
    };
  }
  const withRatings = (sorted as { _id: mongoose.Types.ObjectId }[]).map((p) => ({
    ...p,
    avgRating: ratingMap[p._id.toString()]?.avgRating ?? 0,
    reviewCount: ratingMap[p._id.toString()]?.reviewCount ?? 0,
  }));
  res.json({ ...campaign, products: withRatings });
});

/** Admin: create campaign */
router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response): Promise<void> => {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    return;
  }
  const data = parsed.data;
  const existing = await Campaign.findOne({ slug: data.slug });
  if (existing) {
    res.status(409).json({ error: 'Campaign slug already exists' });
    return;
  }
  const productIds = (data.productIds ?? [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const campaign = await Campaign.create({
    slug: data.slug,
    name: data.name,
    description: data.description ?? '',
    bannerImage: data.bannerImage ?? null,
    productIds,
    couponCode: data.couponCode?.trim() || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    isActive: data.isActive ?? true,
  });
  res.status(201).json(campaign);
});

/** Admin: update campaign */
router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid campaign ID' });
    return;
  }
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    return;
  }
  const data = parsed.data;
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }
  if (campaign.slug !== data.slug) {
    const existing = await Campaign.findOne({ slug: data.slug });
    if (existing) {
      res.status(409).json({ error: 'Campaign slug already exists' });
      return;
    }
  }
  const productIds = (data.productIds ?? [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  campaign.slug = data.slug;
  campaign.name = data.name;
  campaign.description = data.description ?? '';
  campaign.bannerImage = data.bannerImage ?? null;
  campaign.productIds = productIds;
  campaign.couponCode = data.couponCode?.trim() || null;
  campaign.startDate = data.startDate ? new Date(data.startDate) : null;
  campaign.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.isActive !== undefined) campaign.isActive = data.isActive;
  await campaign.save();
  res.json(campaign);
});

/** Admin: delete campaign */
router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid campaign ID' });
    return;
  }
  const deleted = await Campaign.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }
  res.status(204).send();
});

export default router;
