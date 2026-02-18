import express from 'express';
import cors from 'cors';
import { requestIdMiddleware } from './middleware/requestId';
import { authRateLimiter, orderRateLimiter, webhookRateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import chatbotRoutes from './routes/chatbot';
import wishlistRoutes from './routes/wishlist';
import reviewsRoutes from './routes/reviews';
import couponRoutes from './routes/coupons';
import campaignRoutes from './routes/campaigns';
import uploadRoutes from './routes/upload';
import addressRoutes from './routes/addresses';
import deliveryRoutes from './routes/delivery';
import healthRoutes from './routes/health';
import razorpayWebhookRoutes from './routes/webhooks/razorpay';
import shiprocketWebhookRoutes from './routes/webhooks/shiprocket';

const app = express();
app.use(requestIdMiddleware);
app.use(cors());

// Webhook route must receive raw body for signature verification; mount before express.json()
app.use(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  webhookRateLimiter,
  razorpayWebhookRoutes
);

app.use(express.json());

app.use('/api/webhooks/shiprocket', webhookRateLimiter, shiprocketWebhookRoutes);

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRateLimiter, orderRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/upload', authRateLimiter, uploadRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Root route so hitting the server URL returns a clear response
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'API is running',
    health: '/health or /api/health',
    apiBase: '/api',
    endpoints: [
      '/api/auth',
      '/api/products',
      '/api/orders',
      '/api/chatbot',
      '/api/wishlist',
      '/api/reviews',
      '/api/coupons',
      '/api/campaigns',
      '/api/upload',
      '/api/addresses',
      '/api/delivery',
      '/api/webhooks/razorpay',
      '/api/webhooks/shiprocket',
    ],
  });
});

// 404 for any unmatched route (JSON response for API clients)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use(errorHandler);
export default app;
