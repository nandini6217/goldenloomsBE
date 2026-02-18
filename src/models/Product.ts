import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true, enum: ['RESIN', 'HANDLOOM'] },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: null },
    expectedDeliveryTime: { type: String, default: '7-10 days' },
    description: { type: String, default: '' },
    images: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
