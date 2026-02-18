import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  const dbState = mongoose.connection.readyState;
  const healthy = dbState === 1;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    db: dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected',
  });
});

export default router;
