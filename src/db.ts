import mongoose from 'mongoose';
import { config } from './config';

export async function connectDb(): Promise<void> {
  await mongoose.connect(config.mongoUri);
}
