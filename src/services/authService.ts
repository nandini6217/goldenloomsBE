import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { AdminUser } from '../models/AdminUser';
import { AppError } from '../middleware/errorHandler';
import type { LoginBody, RegisterBody } from '../validators/auth';

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface RegisterResult {
  token: string;
  user: AuthUserResponse;
}

export interface LoginResult {
  token: string;
  user: AuthUserResponse;
}

export interface AdminLoginResult {
  token: string;
}

export async function register(data: RegisterBody): Promise<RegisterResult> {
  const { name, email, password, phone } = data;
  const existing = await User.findOne({ email });
  if (existing) throw new AppError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, phone });
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role: 'customer' },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
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

export async function customerLogin(data: LoginBody): Promise<LoginResult> {
  const { email, password } = data;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password');
  }
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role: 'customer' },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
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

export async function adminLogin(data: LoginBody): Promise<AdminLoginResult> {
  const { email, password } = data;
  const admin = await AdminUser.findOne({ email });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    throw new AppError(401, 'Invalid email or password');
  }
  const token = jwt.sign(
    { adminId: admin._id.toString(), email: admin.email, role: 'admin' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  return { token };
}

export async function getMeCustomer(userId: string): Promise<AuthUserResponse> {
  const user = await User.findById(userId).select('name email phone').lean();
  if (!user) throw new AppError(404, 'User not found');
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
  };
}

export async function updateProfile(
  userId: string,
  data: { name: string; phone?: string }
): Promise<{ name: string; email: string; phone: string }> {
  const user = await User.findByIdAndUpdate(
    userId,
    { name: data.name, phone: data.phone ?? '' },
    { new: true }
  )
    .select('name email phone')
    .lean();
  if (!user) throw new AppError(404, 'User not found');
  return {
    name: user.name,
    email: user.email,
    phone: user.phone || '',
  };
}
