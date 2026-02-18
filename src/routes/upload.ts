import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { uploadToS3 } from '../lib/s3';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|webp|gif)$/i;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, WebP, GIF) are allowed'));
    }
  },
});

router.post(
  '/',
  authMiddleware,
  adminOnly,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    try {
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const key = `products/${crypto.randomUUID()}.${ext}`;
      const url = await uploadToS3(req.file.buffer, req.file.mimetype, key);
      res.json({ url });
    } catch (e) {
      console.error('Upload error:', e);
      res.status(500).json({
        error: e instanceof Error ? e.message : 'Upload failed',
      });
    }
  }
);

export default router;
