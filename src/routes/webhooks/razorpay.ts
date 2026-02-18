import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../../config';
import { Order } from '../../models/Order';
import { WebhookEvent } from '../../models/WebhookEvent';
import * as shiprocketService from '../../services/shiprocketService';

const router = Router();

function verifySignature(rawBody: Buffer, signature: string): boolean {
  const secret = config.razorpay.webhookSecret;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const rawBody = req.body as Buffer;
  const signature = (req.headers['x-razorpay-signature'] as string) || '';

  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  if (!verifySignature(rawBody, signature)) {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  let payload: {
    event: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
  };
  try {
    payload = JSON.parse(rawBody.toString()) as typeof payload;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const entity = payload.payload?.payment?.entity;
  const idempotencyKey = entity?.id ?? `razorpay_${payload.event}_${entity?.order_id ?? ''}_${crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 24)}`;
  try {
    await WebhookEvent.create({ eventId: idempotencyKey, source: 'razorpay' });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(200).send('OK');
      return;
    }
    throw err;
  }

  const event = payload.event;

  if (event === 'payment.captured' && entity?.order_id) {
    const razorpayOrderId = entity.order_id;
    const razorpayPaymentId = entity.id || undefined;
    const order = await Order.findOne({ razorpayOrderId });
    if (order) {
      const update: { status: string; razorpayPaymentId?: string; shiprocketOrderId?: string; trackingId?: string; trackingUrl?: string } = {
        status: 'CONFIRMED',
        razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId ?? undefined,
      };
      try {
        if (config.shiprocket.enabled) {
          const shipment = await shiprocketService.createShipment({
            _id: order._id,
            address: order.address,
            customerName: order.customerName,
            email: order.email,
            phone: order.phone,
            totalAmount: order.totalAmount,
            items: order.items,
            addressCity: order.addressCity ?? undefined,
            addressState: order.addressState ?? undefined,
            addressPincode: order.addressPincode ?? undefined,
          });
          if (shipment) {
            update.shiprocketOrderId = String(shipment.shiprocketOrderId);
            if (shipment.awb) update.trackingId = shipment.awb;
            if (shipment.trackingUrl) update.trackingUrl = shipment.trackingUrl;
          }
        }
      } catch (err) {
        console.error('[Razorpay webhook] Shiprocket create shipment failed:', err);
      }
      await Order.findByIdAndUpdate(order._id, update);
    }
  }

  if (event === 'payment.failed' && entity?.order_id) {
    // Leave order as PLACED; customer can retry payment
  }

  res.status(200).send('OK');
});

export default router;
