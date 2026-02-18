"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_1 = require("../validators/product");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
const productService = __importStar(require("../services/productService"));
const router = (0, express_1.Router)();
router.get('/', (0, validate_1.validateQuery)(product_1.productListQuerySchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = req.validatedQuery ?? {};
    const products = await productService.listProducts(query);
    (0, apiResponse_1.success)(res, products);
}));
router.get('/:id', (0, validate_1.validateParamId)('id'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    (0, apiResponse_1.success)(res, product);
}));
router.post('/', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateBody)(product_1.createProductSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req
        .validatedBody;
    const product = await productService.createProduct(data);
    (0, apiResponse_1.success)(res, product, 201);
}));
router.put('/:id', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateParamId)('id'), (0, validate_1.validateBody)(product_1.updateProductSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const data = req
        .validatedBody;
    const product = await productService.updateProduct(id, data);
    (0, apiResponse_1.success)(res, product);
}));
router.delete('/:id', auth_1.authMiddleware, auth_1.adminOnly, (0, validate_1.validateParamId)('id'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
}));
exports.default = router;
