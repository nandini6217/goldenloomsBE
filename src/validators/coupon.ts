import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  total: z.number().min(0),
});

export const createCouponSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().min(0),
  minOrder: z.number().min(0).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  usageLimit: z.number().int().min(0).optional(),
});

export type ValidateCouponBody = z.infer<typeof validateCouponSchema>;
export type CreateCouponBody = z.infer<typeof createCouponSchema>;
