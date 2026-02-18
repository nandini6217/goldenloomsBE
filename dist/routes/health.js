"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    const dbState = mongoose_1.default.connection.readyState;
    const healthy = dbState === 1;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        db: dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected',
    });
});
exports.default = router;
