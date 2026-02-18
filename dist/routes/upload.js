"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = __importDefault(require("crypto"));
const s3_1 = require("../lib/s3");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowed = /^image\/(jpeg|jpg|png|webp|gif)$/i;
        if (allowed.test(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only images (JPEG, PNG, WebP, GIF) are allowed'));
        }
    },
});
router.post('/', auth_1.authMiddleware, auth_1.adminOnly, upload.single('file'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    try {
        const ext = req.file.mimetype.split('/')[1] || 'jpg';
        const key = `products/${crypto_1.default.randomUUID()}.${ext}`;
        const url = await (0, s3_1.uploadToS3)(req.file.buffer, req.file.mimetype, key);
        res.json({ url });
    }
    catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({
            error: e instanceof Error ? e.message : 'Upload failed',
        });
    }
});
exports.default = router;
