import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { notifyOrderPlaced, notifyOrderStatusUpdated } from '../lib/notifications';
import { createRazorpayOrder, getRazorpayKeyId } from '../lib/razorpay';
import * as couponService from './couponService';
import { AppError } from '../middleware/errorHandler';
import type { CreateOrderBody, UpdateOrderStatusBody } from '../validators/order';

export interface OrderAccessContext {
  role: 'admin' | 'customer' | 'guest';
  userId?: string;
  email?: string;
}

/** Merge guest orders (same email, no userId) to the given user. */
export async function mergeGuestOrdersToUser(userId: string, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await Order.updateMany(
    { userId: null, email: new RegExp(`^${escaped}$`, 'i') },
    { $set: { userId: new mongoose.Types.ObjectId(userId) } }
  );
}

export async function createOrder(
  data: CreateOrderBody,
  userId: string | null
): Promise<{ orderId: string }> {
  const { customerName, phone, email, address, addressCity, addressState, addressPincode, items, couponCode } = data;
  const orderItems: { productId: mongoose.Types.ObjectId; name: string; qty: number; priceAtPurchase: number }[] = [];
  let totalAmount = 0;
  for (const item of items) {
    if (!mongoose.Types.ObjectId.isValid(item.productId)) {
      throw new AppError(400, `Invalid product ID: ${item.productId}`);
    }
    const product = await Product.findById(item.productId);
    if (!product) throw new AppError(404, `Product not found: ${item.productId}`);
    if (product.stock < item.qty) {
      throw new AppError(400, `Insufficient stock for ${product.name}`);
    }
    const lineTotal = product.price * item.qty;
    totalAmount += lineTotal;
    orderItems.push({
      productId: product._id,
      name: product.name,
      qty: item.qty,
      priceAtPurchase: product.price,
    });
  }
  let discountAmount = 0;
  let appliedCouponCode: string | undefined;
  if (couponCode?.trim()) {
    const result = await couponService.applyCoupon(couponCode.trim(), totalAmount);
    if (result) {
      discountAmount = result.discount;
      totalAmount = result.finalTotal;
      appliedCouponCode = couponCode.trim().toUpperCase();
    }
  }
  const order = await Order.create({
    userId: userId ? new mongoose.Types.ObjectId(userId) : null,
    customerName,
    phone,
    email,
    address,
    addressCity: addressCity ?? undefined,
    addressState: addressState ?? undefined,
    addressPincode: addressPincode ?? undefined,
    items: orderItems,
    totalAmount,
    discountAmount,
    appliedCouponCode: appliedCouponCode ?? undefined,
  });
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
  }
  if (appliedCouponCode) {
    await couponService.incrementCouponUsage(appliedCouponCode);
  }
  notifyOrderPlaced({
    _id: order._id.toString(),
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    status: order.status,
    totalAmount: order.totalAmount,
    itemCount: orderItems.length,
  }).catch(() => {});
  return { orderId: order._id.toString() };
}

export async function createRazorpayOrderForOrder(
  orderId: string,
  context: OrderAccessContext
): Promise<{ razorpayOrderId: string; keyId: string }> {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new AppError(404, 'Order not found');
  const orderUserId = order.userId?.toString();
  if (context.role === 'customer') {
    if (orderUserId !== context.userId) throw new AppError(404, 'Order not found');
  } else if (context.role === 'guest') {
    if (orderUserId != null) throw new AppError(404, 'Order not found');
  }
  const keyId = getRazorpayKeyId();
  if (!keyId) throw new AppError(503, 'Payment service unavailable');
  const existingRazorpayOrderId = (order as { razorpayOrderId?: string }).razorpayOrderId;
  if (existingRazorpayOrderId) {
    return { razorpayOrderId: existingRazorpayOrderId, keyId };
  }
  const amountPaise = Math.round(Number(order.totalAmount) * 100);
  if (amountPaise < 100) throw new AppError(400, 'Order amount too low');
  try {
    const razorpayOrder = await createRazorpayOrder(amountPaise, orderId);
    await Order.findByIdAndUpdate(orderId, { razorpayOrderId: razorpayOrder.id });
    return { razorpayOrderId: razorpayOrder.id, keyId };
  } catch {
    throw new AppError(502, 'Could not create payment order');
  }
}

export async function getMyOrders(context: { userId: string; email: string }): Promise<unknown[]> {
  const escaped = (context.email || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Order.find({
    $or: [
      { userId: context.userId },
      { userId: null, email: new RegExp(`^${escaped}$`, 'i') },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getOrderById(orderId: string, context: OrderAccessContext): Promise<unknown> {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new AppError(404, 'Order not found');
  const orderUserId = order.userId?.toString();
  if (context.role === 'admin') {
    return order;
  }
  if (context.role === 'customer') {
    if (orderUserId !== context.userId) throw new AppError(404, 'Order not found');
    return order;
  }
  if (orderUserId != null) throw new AppError(404, 'Order not found');
  return order;
}

export async function listOrdersAdmin(): Promise<unknown[]> {
  return Order.find().sort({ createdAt: -1 }).lean();
}

export async function bulkUpdateStatus(
  orderIds: string[],
  status: string
): Promise<{ updated: number; status: string }> {
  const validIds = orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) throw new AppError(400, 'No valid order IDs');
  const result = await Order.updateMany(
    { _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) } },
    { status }
  );
  return { updated: result.modifiedCount ?? 0, status };
}

export async function updateOrderStatus(
  orderId: string,
  data: UpdateOrderStatusBody
): Promise<unknown> {
  const update: { status: string; trackingId?: string | null; trackingUrl?: string | null } = {
    status: data.status,
  };
  if (data.trackingId !== undefined) update.trackingId = data.trackingId || null;
  if (data.trackingUrl !== undefined) update.trackingUrl = data.trackingUrl || null;
  const order = await Order.findByIdAndUpdate(orderId, update, { new: true });
  if (!order) throw new AppError(404, 'Order not found');
  notifyOrderStatusUpdated({
    _id: order._id.toString(),
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    status: order.status,
    totalAmount: order.totalAmount,
  }).catch(() => {});
  return order;
}

export async function cancelOrder(orderId: string, userId: string): Promise<unknown> {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.userId?.toString() !== userId) throw new AppError(404, 'Order not found');
  if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
    throw new AppError(400, 'Order can no longer be cancelled');
  }
  const updated = await Order.findByIdAndUpdate(orderId, { status: 'CANCELLED' }, { new: true }).lean();
  return updated;
}
