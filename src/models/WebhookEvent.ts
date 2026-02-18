import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    source: { type: String, required: true, default: 'razorpay' },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// TTL: delete documents after 7 days to avoid unbounded growth
webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
