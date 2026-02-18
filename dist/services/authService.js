"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.customerLogin = customerLogin;
exports.adminLogin = adminLogin;
exports.getMeCustomer = getMeCustomer;
exports.updateProfile = updateProfile;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const User_1 = require("../models/User");
const AdminUser_1 = require("../models/AdminUser");
const errorHandler_1 = require("../middleware/errorHandler");
async function register(data) {
    const { name, email, password, phone } = data;
    const existing = await User_1.User.findOne({ email });
    if (existing)
        throw new errorHandler_1.AppError(409, 'An account with this email already exists');
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = await User_1.User.create({ name, email, passwordHash, phone });
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, role: 'customer' }, config_1.config.jwtSecret, { expiresIn: '30d' });
    return {
        token,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || '',
        },
    };
}
async function customerLogin(data) {
    const { email, password } = data;
    const user = await User_1.User.findOne({ email });
    if (!user || !(await bcrypt_1.default.compare(password, user.passwordHash))) {
        throw new errorHandler_1.AppError(401, 'Invalid email or password');
    }
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, role: 'customer' }, config_1.config.jwtSecret, { expiresIn: '30d' });
    return {
        token,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || '',
        },
    };
}
async function adminLogin(data) {
    const { email, password } = data;
    const admin = await AdminUser_1.AdminUser.findOne({ email });
    if (!admin || !(await bcrypt_1.default.compare(password, admin.passwordHash))) {
        throw new errorHandler_1.AppError(401, 'Invalid email or password');
    }
    const token = jsonwebtoken_1.default.sign({ adminId: admin._id.toString(), email: admin.email, role: 'admin' }, config_1.config.jwtSecret, { expiresIn: '7d' });
    return { token };
}
async function getMeCustomer(userId) {
    const user = await User_1.User.findById(userId).select('name email phone').lean();
    if (!user)
        throw new errorHandler_1.AppError(404, 'User not found');
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
    };
}
async function updateProfile(userId, data) {
    const user = await User_1.User.findByIdAndUpdate(userId, { name: data.name, phone: data.phone ?? '' }, { new: true })
        .select('name email phone')
        .lean();
    if (!user)
        throw new errorHandler_1.AppError(404, 'User not found');
    return {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
    };
}
