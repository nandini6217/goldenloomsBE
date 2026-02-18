"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.optionalAuth = optionalAuth;
exports.adminOnly = adminOnly;
exports.customerOnly = customerOnly;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function setUserFromToken(req, token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const email = decoded.email;
        if (decoded.adminId) {
            req.user = {
                adminId: decoded.adminId,
                email,
                role: 'admin',
            };
            return true;
        }
        if (decoded.userId) {
            req.user = {
                userId: decoded.userId,
                email,
                role: 'customer',
            };
            return true;
        }
    }
    catch {
        // ignore
    }
    return false;
}
/** Verifies JWT and sets req.user (admin or customer). */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.slice(7);
    if (setUserFromToken(req, token)) {
        next();
    }
    else {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
/** Optionally sets req.user when valid Bearer token is present; never returns 401. */
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        setUserFromToken(req, authHeader.slice(7));
    }
    next();
}
/** Use after authMiddleware: allows only admin. */
function adminOnly(req, res, next) {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}
/** Use after authMiddleware: allows only customer. */
function customerOnly(req, res, next) {
    const user = req.user;
    if (!user || user.role !== 'customer') {
        res.status(401).json({ error: 'Please log in to continue' });
        return;
    }
    next();
}
