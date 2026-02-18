import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';

const { region, accessKeyId, secretAccessKey, s3Bucket } = config.aws;

export const s3Client =
  accessKeyId && secretAccessKey && s3Bucket
    ? new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

const bucket = s3Bucket || '';

export function getPublicUrl(key: string): string {
  if (!bucket) return '';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadToS3(
  buffer: Buffer,
  mimetype: string,
  key: string
): Promise<string> {
  if (!s3Client || !bucket) {
    throw new Error('S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET.');
  }
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );
  return getPublicUrl(key);
}
