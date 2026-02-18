import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().default(''),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().default(''),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
