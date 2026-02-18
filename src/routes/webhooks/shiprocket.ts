import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Order } from '../../models/Order';
import { WebhookEvent } from '../../models/WebhookEvent';

const router = Router();

/**
 * Shiprocket tracking webhook.
 * Configure in Shiprocket: Settings > API > Webhooks > add this URL.
 * Payload may include: order_id (Shiprocket), awb_code, status, scan, etc.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  const orderId = body.order_id != null ? String(body.order_id) : null;
  const awbCode = body.awb_code != null ? String(body.awb_code) : null;
  const status = body.status != null ? String(body.status).toLowerCase() : null;
  const scan = body.scan != null ? String(body.scan).toLowerCase() : null;

  const idempotencyKey = `shiprocket_${orderId ?? ''}_${awbCode ?? ''}_${status ?? ''}_${scan ?? ''}_${crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16)}`;
  try {
    await WebhookEvent.create({ eventId: idempotencyKey, source: 'shiprocket' });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(200).json({ received: true });
      return;
    }
    throw err;
  }

  if (!orderId && !awbCode) {
    res.status(200).json({ received: true });
    return;
  }

  const order = orderId
    ? await Order.findOne({ shiprocketOrderId: orderId })
    : awbCode
      ? await Order.findOne({ trackingId: awbCode })
      : null;

  if (!order) {
    res.status(200).json({ received: true });
    return;
  }

  const newStatus = mapShiprocketStatusToOrder(status ?? scan);
  if (newStatus && newStatus !== order.status) {
    await Order.findByIdAndUpdate(order._id, { status: newStatus });
  }

  res.status(200).json({ received: true });
});

function mapShiprocketStatusToOrder(s: string | null): 'SHIPPED' | 'DELIVERED' | null {
  if (!s) return null;
  if (s.includes('deliver') || s === 'delivered' || s === 'dl') return 'DELIVERED';
  if (
    s.includes('dispatch') ||
    s.includes('ship') ||
    s.includes('transit') ||
    s.includes('pickup') ||
    s.includes('ofd') ||
    s.includes('out for delivery')
  ) {
    return 'SHIPPED';
  }
  return null;
}

export default router;
