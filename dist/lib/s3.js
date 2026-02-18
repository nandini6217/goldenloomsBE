"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
exports.getPublicUrl = getPublicUrl;
exports.uploadToS3 = uploadToS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("../config");
const { region, accessKeyId, secretAccessKey, s3Bucket } = config_1.config.aws;
exports.s3Client = accessKeyId && secretAccessKey && s3Bucket
    ? new client_s3_1.S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    })
    : null;
const bucket = s3Bucket || '';
function getPublicUrl(key) {
    if (!bucket)
        return '';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
async function uploadToS3(buffer, mimetype, key) {
    if (!exports.s3Client || !bucket) {
        throw new Error('S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET.');
    }
    await exports.s3Client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
    }));
    return getPublicUrl(key);
}
