import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    addressCity: { type: String, default: null },
    addressState: { type: String, default: null },
    addressPincode: { type: String, default: null },
    shiprocketOrderId: { type: String, default: null },
    status: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED',
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    appliedCouponCode: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    trackingId: { type: String, default: null },
    trackingUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
