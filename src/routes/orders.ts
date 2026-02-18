import { Router, Request, Response } from 'express';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  bulkUpdateOrderStatusSchema,
  type CreateOrderBody,
  type UpdateOrderStatusBody,
} from '../validators/order';
import { authMiddleware, adminOnly, customerOnly, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateParamId } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import * as orderService from '../services/orderService';

const router = Router();

function getOrderAccessContext(req: Request): orderService.OrderAccessContext {
  const user = (req as AuthenticatedRequest).user;
  if (user?.role === 'admin') return { role: 'admin' };
  if (user?.role === 'customer' && user.userId) return { role: 'customer', userId: user.userId, email: user.email };
  return { role: 'guest' };
}

router.post(
  '/',
  optionalAuth,
  validateBody(createOrderSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: CreateOrderBody }).validatedBody!;
    const user = (req as AuthenticatedRequest).user;
    const userId = user?.role === 'customer' && user.userId ? user.userId : null;
    const result = await orderService.createOrder(data, userId);
    success(res, { orderId: result.orderId }, 201);
  })
);

router.post(
  '/:id/create-razorpay-order',
  optionalAuth,
  validateParamId('id'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params.id;
    const context = getOrderAccessContext(req);
    const result = await orderService.createRazorpayOrderForOrder(orderId, context);
    success(res, result);
  })
);

router.get(
  '/me',
  authMiddleware,
  customerOnly,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user!;
    const orders = await orderService.getMyOrders({ userId: user.userId!, email: user.email || '' });
    success(res, orders);
  })
);

router.get(
  '/',
  authMiddleware,
  adminOnly,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const orders = await orderService.listOrdersAdmin();
    success(res, orders);
  })
);

router.get(
  '/:id',
  optionalAuth,
  validateParamId('id'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params.id;
    const context = getOrderAccessContext(req);
    const order = await orderService.getOrderById(orderId, context);
    success(res, order);
  })
);

router.put(
  '/bulk-status',
  authMiddleware,
  adminOnly,
  validateBody(bulkUpdateOrderStatusSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: { orderIds: string[]; status: string } })
      .validatedBody!;
    const result = await orderService.bulkUpdateStatus(data.orderIds, data.status);
    success(res, result);
  })
);

router.put(
  '/:id/status',
  authMiddleware,
  adminOnly,
  validateParamId('id'),
  validateBody(updateOrderStatusSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params.id;
    const data = (req as Request & { validatedBody?: UpdateOrderStatusBody }).validatedBody!;
    const order = await orderService.updateOrderStatus(orderId, data);
    success(res, order);
  })
);

router.patch(
  '/:id/cancel',
  authMiddleware,
  customerOnly,
  validateParamId('id'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params.id;
    const user = (req as AuthenticatedRequest).user!;
    const order = await orderService.cancelOrder(orderId, user.userId!);
    success(res, order);
  })
);

export default router;
