"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.getProductById = getProductById;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = require("../models/Product");
const Review_1 = require("../models/Review");
const errorHandler_1 = require("../middleware/errorHandler");
async function listProducts(query) {
    const filter = {};
    if (typeof query.search === 'string' && query.search.trim()) {
        filter.$or = [
            { name: new RegExp(query.search.trim(), 'i') },
            { description: new RegExp(query.search.trim(), 'i') },
        ];
    }
    if (query.category === 'RESIN' || query.category === 'HANDLOOM')
        filter.category = query.category;
    if (query.featured === 'true')
        filter.isFeatured = true;
    if (typeof query.ids === 'string' && query.ids.trim()) {
        const idList = query.ids
            .split(',')
            .map((s) => s.trim())
            .filter((s) => mongoose_1.default.Types.ObjectId.isValid(s));
        if (idList.length > 0) {
            filter._id = { $in: idList.map((id) => new mongoose_1.default.Types.ObjectId(id)) };
        }
    }
    const min = typeof query.minPrice === 'string' && query.minPrice.trim() ? Number(query.minPrice) : NaN;
    const max = typeof query.maxPrice === 'string' && query.maxPrice.trim() ? Number(query.maxPrice) : NaN;
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
        const priceCond = {};
        if (!Number.isNaN(min) && min >= 0)
            priceCond.$gte = min;
        if (!Number.isNaN(max) && max >= 0)
            priceCond.$lte = max;
        if (Object.keys(priceCond).length > 0)
            filter.price = priceCond;
    }
    let q = Product_1.Product.find(filter);
    if (query.sort === 'price_asc')
        q = q.sort({ price: 1 });
    else if (query.sort === 'price_desc')
        q = q.sort({ price: -1 });
    const products = await q.lean();
    const ids = products.map((p) => p._id);
    const ratingStats = await Review_1.Review.aggregate([
        { $match: { productId: { $in: ids } } },
        { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingMap = {};
    for (const s of ratingStats) {
        ratingMap[s._id.toString()] = {
            avgRating: Math.round(s.avg * 10) / 10,
            reviewCount: s.count,
        };
    }
    return products.map((p) => ({
        ...p,
        _id: p._id.toString(),
        avgRating: ratingMap[p._id.toString()]?.avgRating ?? 0,
        reviewCount: ratingMap[p._id.toString()]?.reviewCount ?? 0,
    }));
}
async function getProductById(id) {
    const product = await Product_1.Product.findById(id).lean();
    if (!product)
        throw new errorHandler_1.AppError(404, 'Product not found');
    const stats = await Review_1.Review.aggregate([
        { $match: { productId: new mongoose_1.default.Types.ObjectId(id) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avgRating = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
    const reviewCount = stats[0]?.count ?? 0;
    return {
        ...product,
        _id: product._id.toString(),
        avgRating,
        reviewCount,
    };
}
async function createProduct(data) {
    const existing = await Product_1.Product.findOne({ slug: data.slug });
    if (existing)
        throw new errorHandler_1.AppError(409, 'Product with this slug already exists');
    return Product_1.Product.create(data);
}
async function updateProduct(id, data) {
    if (data.slug) {
        const existing = await Product_1.Product.findOne({ slug: data.slug, _id: { $ne: id } });
        if (existing)
            throw new errorHandler_1.AppError(409, 'Product with this slug already exists');
    }
    const product = await Product_1.Product.findByIdAndUpdate(id, data, { new: true });
    if (!product)
        throw new errorHandler_1.AppError(404, 'Product not found');
    return product;
}
async function deleteProduct(id) {
    const product = await Product_1.Product.findByIdAndDelete(id);
    if (!product)
        throw new errorHandler_1.AppError(404, 'Product not found');
}
