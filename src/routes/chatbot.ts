import { Router, Request, Response } from 'express';
import { ChatbotLead } from '../models/ChatbotLead';
import { createChatbotLeadSchema } from '../validators/chatbot';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createChatbotLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }
  const lead = await ChatbotLead.create(parsed.data);
  res.status(201).json({ success: true, id: lead._id });
});

export default router;
