import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    bannerImage: { type: String, default: null },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    couponCode: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model('Campaign', campaignSchema);
