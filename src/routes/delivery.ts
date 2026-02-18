import { Router, Request, Response } from 'express';

const router = Router();

// Simple rule-based pincode check: 6-digit Indian pincode = serviceable, else not
// Can be replaced with a real pincode list or external API later
router.get('/check', (req: Request, res: Response): void => {
  const pincode = typeof req.query.pincode === 'string' ? req.query.pincode.trim() : '';
  const valid = /^\d{6}$/.test(pincode);
  if (!valid) {
    res.json({
      serviceable: false,
      message: 'Enter a valid 6-digit pincode to check delivery.',
    });
    return;
  }
  const today = new Date();
  const deliveryDate = new Date(today);
  deliveryDate.setDate(deliveryDate.getDate() + 10);
  res.json({
    serviceable: true,
    message: `Delivery by ${deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (7-10 business days)`,
  });
});

export default router;
