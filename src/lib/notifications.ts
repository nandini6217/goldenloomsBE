/**
 * Order notifications: Discord webhook (leads/orders) and placeholder for email/SMS.
 * Set DISCORD_WEBHOOK_URL to receive order and lead alerts in Discord.
 */

import { notifyDiscordOrder } from './discord';

type OrderPayload = {
  _id: string;
  customerName: string;
  email: string;
  phone?: string;
  status: string;
  totalAmount: number;
  itemCount?: number;
};

export async function notifyOrderPlaced(order: OrderPayload): Promise<void> {
  notifyDiscordOrder({
    orderId: order._id,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    totalAmount: order.totalAmount,
    itemCount: order.itemCount,
  }).catch(() => {});
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
