"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Campaign_1 = require("../models/Campaign");
const Product_1 = require("../models/Product");
const Review_1 = require("../models/Review");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const now = () => new Date();
function isActiveCampaign(c) {
    if (!c.isActive)
        return false;
    const t = now();
    if (c.startDate && t < c.startDate)
        return false;
    if (c.endDate && t > c.endDate)
        return false;
    return true;
}
const createCampaignSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).transform((s) => s.trim().toLowerCase()),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    bannerImage: zod_1.z.string().optional(),
    productIds: zod_1.z.array(zod_1.z.string()).optional(),
    couponCode: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
/** List campaigns: public = active only */
router.get('/', async (_req, res) => {
    const all = await Campaign_1.Campaign.find({ isActive: true }).lean();
    const active = all.filter((c) => isActiveCampaign(c));
    res.json(active);
});
/** Admin: list all campaigns (for admin UI) */
router.get('/all', auth_1.authMiddleware, auth_1.adminOnly, async (_req, res) => {
    const campaigns = await Campaign_1.Campaign.find().sort({ createdAt: -1 }).lean();
    res.json(campaigns);
});
/** Get campaign by slug (public: returns campaign + products) or by id (admin with auth, for edit). */
router.get('/:slugOrId', auth_1.optionalAuth, async (req, res) => {
    const { slugOrId } = req.params;
    const isAdmin = req.user?.role === 'admin';
    let campaign = null;
    if (mongoose_1.default.Types.ObjectId.isValid(slugOrId) && slugOrId.length === 24 && isAdmin) {
        campaign = await Campaign_1.Campaign.findById(slugOrId).lean();
    }
    if (!campaign) {
        campaign = await Campaign_1.Campaign.findOne({ slug: slugOrId }).lean();
    }
    if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
    }
    const ids = campaign.productIds ?? [];
    const products = await Product_1.Product.find({ _id: { $in: ids } }).lean();
    const orderMap = new Map(ids.map((id, i) => [id.toString(), i]));
    const sorted = products
        .slice()
        .sort((a, b) => (orderMap.get(a._id.toString()) ?? 999) - (orderMap.get(b._id.toString()) ?? 999));
    const productIdList = sorted.map((p) => p._id);
    const ratingStats = await Review_1.Review.aggregate([
        { $match: { productId: { $in: productIdList } } },
        { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingMap = {};
    for (const s of ratingStats) {
        ratingMap[s._id.toString()] = {
            avgRating: Math.round(s.avg * 10) / 10,
            reviewCount: s.count,
        };
    }
    const withRatings = sorted.map((p) => ({
        ...p,
        avgRating: ratingMap[p._id.toString()]?.avgRating ?? 0,
        reviewCount: ratingMap[p._id.toString()]?.reviewCount ?? 0,
    }));
    res.json({ ...campaign, products: withRatings });
});
/** Admin: create campaign */
router.post('/', auth_1.authMiddleware, auth_1.adminOnly, async (req, res) => {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
        return;
    }
    const data = parsed.data;
    const existing = await Campaign_1.Campaign.findOne({ slug: data.slug });
    if (existing) {
        res.status(409).json({ error: 'Campaign slug already exists' });
        return;
    }
    const productIds = (data.productIds ?? [])
        .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
        .map((id) => new mongoose_1.default.Types.ObjectId(id));
    const campaign = await Campaign_1.Campaign.create({
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
router.put('/:id', auth_1.authMiddleware, auth_1.adminOnly, async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid campaign ID' });
        return;
    }
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
        return;
    }
    const data = parsed.data;
    const campaign = await Campaign_1.Campaign.findById(id);
    if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
    }
    if (campaign.slug !== data.slug) {
        const existing = await Campaign_1.Campaign.findOne({ slug: data.slug });
        if (existing) {
            res.status(409).json({ error: 'Campaign slug already exists' });
            return;
        }
    }
    const productIds = (data.productIds ?? [])
        .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
        .map((id) => new mongoose_1.default.Types.ObjectId(id));
    campaign.slug = data.slug;
    campaign.name = data.name;
    campaign.description = data.description ?? '';
    campaign.bannerImage = data.bannerImage ?? null;
    campaign.productIds = productIds;
    campaign.couponCode = data.couponCode?.trim() || null;
    campaign.startDate = data.startDate ? new Date(data.startDate) : null;
    campaign.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.isActive !== undefined)
        campaign.isActive = data.isActive;
    await campaign.save();
    res.json(campaign);
});
/** Admin: delete campaign */
router.delete('/:id', auth_1.authMiddleware, auth_1.adminOnly, async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid campaign ID' });
        return;
    }
    const deleted = await Campaign_1.Campaign.findByIdAndDelete(id);
    if (!deleted) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
    }
    res.status(204).send();
});
exports.default = router;
