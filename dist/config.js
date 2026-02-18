"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const nodeEnv = process.env.NODE_ENV ?? 'development';
const isDev = nodeEnv === 'development';
function requireInProduction(name, value) {
    if (!isDev && (value === undefined || value === '')) {
        throw new Error(`${name} is required in production. Set the corresponding environment variable.`);
    }
    return (value ?? '');
}
exports.config = {
    port: parseInt(process.env.PORT ?? '4000', 10),
    nodeEnv,
    isDev,
    mongoUri: process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? '',
    jwtSecret: isDev
        ? (process.env.JWT_SECRET ?? 'dev-secret-change-in-production')
        : requireInProduction('JWT_SECRET', process.env.JWT_SECRET),
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID ?? '',
        keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    },
    aws: {
        region: process.env.AWS_REGION ?? 'ap-south-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
        s3Bucket: process.env.S3_BUCKET ?? '',
    },
    frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    backendUrl: (process.env.BACKEND_URL ?? process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, ''),
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
};
if (!exports.config.mongoUri) {
    throw new Error('MONGODB_URI or DATABASE_URL is required');
}
