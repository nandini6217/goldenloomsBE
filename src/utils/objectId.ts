import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler';

export function parseObjectId(
  id: string,
  message = 'Invalid ID'
): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, message);
  }
  return new mongoose.Types.ObjectId(id);
}

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}
