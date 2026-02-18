import Razorpay from 'razorpay';
import { config } from '../config';

let client: Razorpay | null = null;

if (config.razorpay.keyId && config.razorpay.keySecret) {
  client = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
}

export function getRazorpayClient(): Razorpay | null {
  return client;
}

export function getRazorpayKeyId(): string | null {
  return config.razorpay.keyId || null;
}

export async function createRazorpayOrder(
  amountPaise: number,
  orderId: string
): Promise<{ id: string }> {
  const razorpay = getRazorpayClient();
  if (!razorpay) {
    throw new Error('Payment service unavailable');
  }
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    notes: { orderId },
  });
  return { id: order.id };
}
