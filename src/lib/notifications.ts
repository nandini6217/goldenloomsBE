/**
 * Placeholder for order notifications (email/SMS).
 * Replace with real provider (Resend, SendGrid, Twilio, etc.) and set env vars.
 */

type OrderPayload = {
  _id: string;
  customerName: string;
  email: string;
  phone?: string;
  status: string;
  totalAmount: number;
};

export async function notifyOrderPlaced(order: OrderPayload): Promise<void> {
  // TODO: send email to order.email e.g. "Your order #xxx has been placed."
  if (process.env.NODE_ENV !== 'test') {
    console.log('[Notification] Order placed:', order._id, order.email);
  }
}

export async function notifyOrderStatusUpdated(order: OrderPayload): Promise<void> {
  // TODO: send email when status is SHIPPED or DELIVERED
  if (process.env.NODE_ENV !== 'test' && ['SHIPPED', 'DELIVERED'].includes(order.status)) {
    console.log('[Notification] Order status:', order.status, order._id, order.email);
  }
}
