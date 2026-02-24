import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { loginSchema, registerSchema, updateProfileSchema } from '../validators/auth';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import * as authService from '../services/authService';
import * as orderService from '../services/orderService';
import { notifyDiscordLead } from '../lib/discord';

const router = Router();

router.get('/google', (req: Request, res: Response): void => {
  if (!config.googleClientId) {
    res.status(503).json({ error: 'Google sign-in is not configured' });
    return;
  }
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
  const state = encodeURIComponent(returnTo);
  const redirectUri = `${config.backendUrl}/api/auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.googleClientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  res.redirect(url.toString());
});

router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  if (!config.googleClientId || !config.googleClientSecret) {
    res.redirect(`${config.frontendUrl}/login?error=oauth_not_configured`);
    return;
  }
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const returnTo = typeof req.query.state === 'string' ? decodeURIComponent(req.query.state) : '/';
  const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/';

  if (!code) {
    res.redirect(`${config.frontendUrl}/login?error=oauth_denied&returnTo=${encodeURIComponent(safeReturnTo)}`);
    return;
  }

  const redirectUri = `${config.backendUrl}/api/auth/google/callback`;
  let tokenRes: Awaited<ReturnType<typeof fetch>>;
  try {
    tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
    return;
  }

  if (!tokenRes.ok) {
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
    return;
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokens.access_token;
  if (!accessToken) {
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
    return;
  }

  let userinfoRes: Awaited<ReturnType<typeof fetch>>;
  try {
    userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
    return;
  }

  if (!userinfoRes.ok) {
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed&returnTo=${encodeURIComponent(safeReturnTo)}`);
    return;
  }

  const profile = (await userinfoRes.json()) as { email?: string; name?: string; given_name?: string };
  const email = profile.email?.trim().toLowerCase();
  if (!email) {
    res.redirect(`${config.frontendUrl}/login?error=oauth_no_email&returnTo=${encodeURIComponent(safeReturnTo)}`);
    return;
  }

  let user = await User.findOne({ email });
  if (!user) {
    const oauthPlaceholderHash = await bcrypt.hash('oauth-google-no-password', 10);
    user = await User.create({
      name: profile.name || profile.given_name || email.split('@')[0],
      email,
      passwordHash: oauthPlaceholderHash,
      phone: '',
    });
  }
  await orderService.mergeGuestOrdersToUser(user._id.toString(), user.email);
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role: 'customer' },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
  const callbackUrl = `${config.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(safeReturnTo)}`;
  res.redirect(callbackUrl);
});

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: import('../validators/auth').RegisterBody }).validatedBody!;
    const result = await authService.register(data);
    await orderService.mergeGuestOrdersToUser(result.user.id, result.user.email);
    notifyDiscordLead({
      source: 'Registration',
      name: result.user.name ?? result.user.email,
      email: result.user.email,
      phone: result.user.phone,
    }).catch(() => {});
    success(res, { token: result.token, user: result.user }, 201);
  })
);

router.post(
  '/customer/login',
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: import('../validators/auth').LoginBody }).validatedBody!;
    const result = await authService.customerLogin(data);
    await orderService.mergeGuestOrdersToUser(result.user.id, result.user.email);
    success(res, { token: result.token, user: result.user });
  })
);

router.post(
  '/admin/login',
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = (req as Request & { validatedBody?: import('../validators/auth').LoginBody }).validatedBody!;
    const result = await authService.adminLogin(data);
    success(res, { token: result.token });
  })
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) throw new AppError(401, 'Unauthorized');
    if (authUser.role === 'admin') {
      success(res, { role: 'admin', email: authUser.email });
      return;
    }
    const user = await authService.getMeCustomer(authUser.userId!);
    success(res, { role: 'customer', userId: user.id, name: user.name, email: user.email, phone: user.phone });
  })
);

router.patch(
  '/profile',
  authMiddleware,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser || authUser.role !== 'customer') throw new AppError(403, 'Customer access required');
    const data = (req as Request & { validatedBody?: import('../validators/auth').UpdateProfileBody }).validatedBody!;
    const profile = await authService.updateProfile(authUser.userId!, data);
    success(res, profile);
  })
);

export default router;
