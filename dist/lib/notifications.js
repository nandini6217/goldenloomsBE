"use strict";
/**
 * Placeholder for order notifications (email/SMS).
 * Replace with real provider (Resend, SendGrid, Twilio, etc.) and set env vars.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyOrderPlaced = notifyOrderPlaced;
exports.notifyOrderStatusUpdated = notifyOrderStatusUpdated;
async function notifyOrderPlaced(order) {
    // TODO: send email to order.email e.g. "Your order #xxx has been placed."
    if (process.env.NODE_ENV !== 'test') {
        console.log('[Notification] Order placed:', order._id, order.email);
    }
}
async function notifyOrderStatusUpdated(order) {
    // TODO: send email when status is SHIPPED or DELIVERED
    if (process.env.NODE_ENV !== 'test' && ['SHIPPED', 'DELIVERED'].includes(order.status)) {
        console.log('[Notification] Order status:', order.status, order._id, order.email);
    }
}
