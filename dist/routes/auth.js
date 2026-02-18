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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const User_1 = require("../models/User");
const auth_1 = require("../validators/auth");
const auth_2 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
const errorHandler_1 = require("../middleware/errorHandler");
const authService = __importStar(require("../services/authService"));
const orderService = __importStar(require("../services/orderService"));
const router = (0, express_1.Router)();
router.get('/google', (req, res) => {
    if (!config_1.config.googleClientId) {
        res.status(503).json({ error: 'Google sign-in is not configured' });
        return;
    }
    const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
    const state = encodeURIComponent(returnTo);
    const redirectUri = `${config_1.config.backendUrl}/api/auth/google/callback`;
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config_1.config.googleClientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    res.redirect(url.toString());
});
router.get('/google/callback', async (req, res) => {
    if (!config_1.config.googleClientId || !config_1.config.googleClientSecret) {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_not_configured`);
        return;
    }
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const returnTo = typeof req.query.state === 'string' ? decodeURIComponent(req.query.state) : '/';
    const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/';
    if (!code) {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_denied&returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
    }
    const redirectUri = `${config_1.config.backendUrl}/api/auth/google/callback`;
    let tokenRes;
    try {
        tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: config_1.config.googleClientId,
                client_secret: config_1.config.googleClientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });
    }
    catch {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
    }
    if (!tokenRes.ok) {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
    }
    const tokens = (await tokenRes.json());
    const accessToken = tokens.access_token;
    if (!accessToken) {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
    }
    let userinfoRes;
    try {
        userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    }
    catch {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
    }
    if (!userinfoRes.ok) {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
    }
    const profile = (await userinfoRes.json());
    const email = profile.email?.trim().toLowerCase();
    if (!email) {
        res.redirect(`${config_1.config.frontendUrl}/login?error=oauth_no_email&returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
    }
    let user = await User_1.User.findOne({ email });
    if (!user) {
        const oauthPlaceholderHash = await bcrypt_1.default.hash('oauth-google-no-password', 10);
        user = await User_1.User.create({
            name: profile.name || profile.given_name || email.split('@')[0],
            email,
            passwordHash: oauthPlaceholderHash,
            phone: '',
        });
    }
    await orderService.mergeGuestOrdersToUser(user._id.toString(), user.email);
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, role: 'customer' }, config_1.config.jwtSecret, { expiresIn: '30d' });
    const callbackUrl = `${config_1.config.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(safeReturnTo)}`;
    res.redirect(callbackUrl);
});
router.post('/register', (0, validate_1.validateBody)(auth_1.registerSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req.validatedBody;
    const result = await authService.register(data);
    await orderService.mergeGuestOrdersToUser(result.user.id, result.user.email);
    (0, apiResponse_1.success)(res, { token: result.token, user: result.user }, 201);
}));
router.post('/customer/login', (0, validate_1.validateBody)(auth_1.loginSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req.validatedBody;
    const result = await authService.customerLogin(data);
    await orderService.mergeGuestOrdersToUser(result.user.id, result.user.email);
    (0, apiResponse_1.success)(res, { token: result.token, user: result.user });
}));
router.post('/admin/login', (0, validate_1.validateBody)(auth_1.loginSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = req.validatedBody;
    const result = await authService.adminLogin(data);
    (0, apiResponse_1.success)(res, { token: result.token });
}));
router.get('/me', auth_2.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authUser = req.user;
    if (!authUser)
        throw new errorHandler_1.AppError(401, 'Unauthorized');
    if (authUser.role === 'admin') {
        (0, apiResponse_1.success)(res, { role: 'admin', email: authUser.email });
        return;
    }
    const user = await authService.getMeCustomer(authUser.userId);
    (0, apiResponse_1.success)(res, { role: 'customer', userId: user.id, name: user.name, email: user.email, phone: user.phone });
}));
router.patch('/profile', auth_2.authMiddleware, (0, validate_1.validateBody)(auth_1.updateProfileSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authUser = req.user;
    if (!authUser || authUser.role !== 'customer')
        throw new errorHandler_1.AppError(403, 'Customer access required');
    const data = req.validatedBody;
    const profile = await authService.updateProfile(authUser.userId, data);
    (0, apiResponse_1.success)(res, profile);
}));
exports.default = router;
