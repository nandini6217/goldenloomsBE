import { z } from 'zod';

export const createOrderSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPincode: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().min(1),
    })
  ).min(1),
  couponCode: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  trackingId: z.string().optional(),
  trackingUrl: z.string().url().optional().or(z.literal('')),
});

export const bulkUpdateOrderStatusSchema = z.object({
  orderIds: z.array(z.string()).min(1, 'Select at least one order'),
  status: z.enum(['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;
export type BulkUpdateOrderStatusBody = z.infer<typeof bulkUpdateOrderStatusSchema>;
