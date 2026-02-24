import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { notifyDiscordEvent } from '../lib/discord';

const router = Router();

const eventSchema = z.object({
  event: z.enum(['product_view', 'add_to_cart', 'add_to_wishlist', 'product_zoom', 'view_full_details']),
  productId: z.string().optional(),
  productName: z.string().optional(),
  category: z.string().optional(),
  qty: z.number().int().min(1).optional(),
  source: z.string().max(100).optional(),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid event payload', details: parsed.error.flatten() });
    return;
  }
  res.status(204).end();
  notifyDiscordEvent({
    event: parsed.data.event,
    productId: parsed.data.productId,
    productName: parsed.data.productName,
    category: parsed.data.category,
    qty: parsed.data.qty,
    source: parsed.data.source,
  }).catch(() => {});
});

export default router;
