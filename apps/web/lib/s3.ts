import 'server-only';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isAbsoluteUrl } from '@rotpitch/shared';

/**
 * Server-only presigner for finished render output. The outputs bucket is a
 * PRIVATE S3 bucket; `videos.output_url` holds the object KEY. The dashboard is
 * server-rendered, so we mint a short-lived presigned GET URL here and drop it
 * straight into the <video>/<a download> tags — no AWS credentials ever reach
 * the browser. URLs are re-signed on every server render, so the expiry only
 * needs to outlast a viewing session.
 *
 * Credentials come from the SDK default chain — on Vercel that's the
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars (scope this IAM user to
 * s3:GetObject on the outputs bucket only).
 */
const REGION = process.env.AWS_REGION ?? 'us-east-1';
const BUCKET = process.env.S3_OUTPUT_BUCKET ?? 'rotpitch-outputs';
const EXPIRES_SEC = Number(process.env.S3_PRESIGN_EXPIRES_SEC ?? 3600);

const s3 = new S3Client({ region: REGION });

/**
 * Mint a presigned GET URL for a stored output value. Legacy rows (pre-S3) hold
 * a full Supabase public URL — return those unchanged. Returns null for an
 * empty value or if signing fails (the card falls back to its placeholder).
 */
export async function presignOutput(storedValue: string | null): Promise<string | null> {
  if (!storedValue) return null;
  if (isAbsoluteUrl(storedValue)) return storedValue;
  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: storedValue }),
      { expiresIn: EXPIRES_SEC },
    );
  } catch {
    return null;
  }
}
