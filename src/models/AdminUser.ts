import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'ADMIN' },
  },
  { timestamps: true }
);

export const AdminUser = mongoose.model('AdminUser', adminUserSchema);
