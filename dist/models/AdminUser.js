"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUser = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const adminUserSchema = new mongoose_1.default.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'ADMIN' },
}, { timestamps: true });
exports.AdminUser = mongoose_1.default.model('AdminUser', adminUserSchema);
