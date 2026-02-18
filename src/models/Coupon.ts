import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, required: true, enum: ['PERCENTAGE', 'FIXED'] },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Coupon = mongoose.model('Coupon', couponSchema);
