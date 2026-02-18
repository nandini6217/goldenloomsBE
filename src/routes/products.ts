import { Router, Request, Response } from 'express';
import { createProductSchema, updateProductSchema, productListQuerySchema } from '../validators/product';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { validateBody, validateQuery, validateParamId } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import * as productService from '../services/productService';

const router = Router();

router.get(
  '/',
  validateQuery(productListQuerySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = (req as Request & { validatedQuery?: productService.ProductListQuery }).validatedQuery ?? {};
    const products = await productService.listProducts(query);
    success(res, products);
  })
);

router.get(
  '/:id',
  validateParamId('id'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const product = await productService.getProductById(req.params.id);
    success(res, product);
  })
);

router.post(
  '/',
  authMiddleware,
  adminOnly,
  validateBody(createProductSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: import('../validators/product').CreateProductBody })
      .validatedBody!;
    const product = await productService.createProduct(data);
    success(res, product, 201);
  })
);

router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  validateParamId('id'),
  validateBody(updateProductSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const data = (req as Request & { validatedBody?: import('../validators/product').UpdateProductBody })
      .validatedBody!;
    const product = await productService.updateProduct(id, data);
    success(res, product);
  })
);

router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  validateParamId('id'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  })
);

export default router;
