"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const multer_1 = require("multer");
const logger_1 = require("../lib/logger");
class AppError extends Error {
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        });
        return;
    }
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
    }
    if (err instanceof multer_1.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
        res.status(400).json({ error: message });
        return;
    }
    if (err instanceof Error && err.message.startsWith('Only images')) {
        res.status(400).json({ error: err.message });
        return;
    }
    const requestId = _req.requestId;
    logger_1.logger.error('Unhandled error', { requestId, err: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ error: 'Internal server error' });
}
