import { Router, Request, Response } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { validateBody, validateParamId } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import * as couponService from '../services/couponService';
import { validateCouponSchema, createCouponSchema } from '../validators/coupon';

const router = Router();

router.post(
  '/validate',
  validateBody(validateCouponSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: import('../validators/coupon').ValidateCouponBody })
      .validatedBody!;
    const result = await couponService.validateCoupon(data.code, data.total);
    success(res, result);
  })
);

router.post(
  '/',
  authMiddleware,
  adminOnly,
  validateBody(createCouponSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: import('../validators/coupon').CreateCouponBody })
      .validatedBody!;
    const coupon = await couponService.createCoupon(data);
    success(res, coupon, 201);
  })
);

router.get(
  '/',
  authMiddleware,
  adminOnly,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const coupons = await couponService.listCoupons();
    success(res, coupons);
  })
);

router.get(
  '/:id',
  authMiddleware,
  adminOnly,
  validateParamId('id'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const coupon = await couponService.getCouponById(req.params.id);
    success(res, coupon);
  })
);

router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  validateParamId('id'),
  validateBody(createCouponSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const data = (req as Request & { validatedBody?: import('../validators/coupon').CreateCouponBody })
      .validatedBody!;
    const coupon = await couponService.updateCoupon(id, data);
    success(res, coupon);
  })
);

router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  validateParamId('id'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await couponService.deleteCoupon(req.params.id);
    res.status(204).send();
  })
);

export default router;
