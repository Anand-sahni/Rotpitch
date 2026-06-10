import { readFile } from 'node:fs/promises';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isAbsoluteUrl } from '@rotpitch/shared';
import { env } from '../env.js';
import { AppError } from '../lib/errors.js';

/**
 * AWS S3 wrapper for finished render output. The outputs bucket is PRIVATE —
 * objects are never publicly readable. We store the object key in
 * `videos.output_url` and mint a short-lived presigned GET URL on read.
 *
 * Credentials follow the AWS SDK default chain: on EC2 the instance profile
 * (IAM role) supplies them automatically; elsewhere (or locally) the standard
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars are picked up. So we only
 * pass the region explicitly.
 */
const s3 = new S3Client({ region: env.AWS_REGION });

/** Upload a local file to the outputs bucket. Returns the stored object key. */
export async function uploadOutput(key: string, localPath: string, contentType: string): Promise<string> {
  const body = await readFile(localPath);
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_OUTPUT_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  } catch (err) {
    throw new AppError(502, 'storage_upload_failed', `Could not upload s3://${env.S3_OUTPUT_BUCKET}/${key}: ${(err as Error).message}`);
  }
  return key;
}

/**
 * Mint a presigned GET URL for a stored output value. Legacy rows hold a full
 * Supabase public URL — return those unchanged; otherwise treat the value as an
 * S3 object key and sign it. Returns null for an empty value.
 */
export async function presignOutput(storedValue: string | null): Promise<string | null> {
  if (!storedValue) return null;
  if (isAbsoluteUrl(storedValue)) return storedValue;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_OUTPUT_BUCKET, Key: storedValue }),
    { expiresIn: env.S3_PRESIGN_EXPIRES_SEC },
  );
}

/** Best-effort delete of an output object; logs but never throws. */
export async function deleteOutput(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.S3_OUTPUT_BUCKET, Key: key }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[s3] delete failed for ${key}:`, (err as Error).message);
  }
}
