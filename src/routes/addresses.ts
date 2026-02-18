import { Router, Request, Response } from 'express';
import { Address } from '../models/Address';
import { authMiddleware, customerOnly, AuthenticatedRequest } from '../middleware/auth';
import { createAddressSchema, updateAddressSchema } from '../validators/address';
import mongoose from 'mongoose';

const router = Router();

// List my addresses (customer only)
router.get('/', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const userId = new mongoose.Types.ObjectId(user.userId);
  const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: 1 }).lean();
  res.json(addresses);
});

// Create address (customer only)
router.post('/', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const parsed = createAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    return;
  }
  const data = parsed.data;
  const userId = new mongoose.Types.ObjectId(user.userId);
  if (data.isDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }
  const address = await Address.create({
    userId,
    ...data,
  });
  res.status(201).json(address);
});

// Update address (customer only, own address)
router.put('/:id', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid address ID' });
    return;
  }
  const userId = new mongoose.Types.ObjectId(user.userId);
  const existing = await Address.findOne({ _id: id, userId });
  if (!existing) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  const parsed = updateAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    return;
  }
  const data = parsed.data;
  if (data.isDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }
  const address = await Address.findByIdAndUpdate(id, data, { new: true }).lean();
  res.json(address);
});

// Set default address (customer only)
router.patch('/:id/default', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid address ID' });
    return;
  }
  const userId = new mongoose.Types.ObjectId(user.userId);
  const existing = await Address.findOne({ _id: id, userId });
  if (!existing) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  await Address.updateMany({ userId }, { isDefault: false });
  await Address.findByIdAndUpdate(id, { isDefault: true });
  const address = await Address.findById(id).lean();
  res.json(address);
});

// Delete address (customer only, own address)
router.delete('/:id', authMiddleware, customerOnly, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid address ID' });
    return;
  }
  const userId = new mongoose.Types.ObjectId(user.userId);
  const deleted = await Address.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  res.json({ deleted: true });
});

export default router;
