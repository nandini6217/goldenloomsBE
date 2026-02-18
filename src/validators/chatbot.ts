import { z } from 'zod';

export const createChatbotLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  productTypeRequired: z.string().min(1, 'Product type is required').max(200),
  message: z.string().max(1000).optional(),
});

export type CreateChatbotLeadBody = z.infer<typeof createChatbotLeadSchema>;
