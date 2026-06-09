/**
 * Sync background loops from an S3 bucket into the Supabase `backgrounds`
 * bucket, named `{style_key}.mp4` so both the render worker (apps/api storage.ts)
 * and the picker preview (apps/web lib/backgrounds.ts) find them.
 *
 * Usage (reads creds from root .env):
 *   node --env-file=.env scripts/sync-backgrounds.mjs --bucket=<s3-bucket> --list
 *   node --env-file=.env scripts/sync-backgrounds.mjs --bucket=<s3-bucket> [--prefix=path/] [--dry-run]
 *
 *   --list      Only list .mp4 objects in the S3 bucket (discover names first).
 *   --dry-run   Show the planned S3 key -> Supabase key mapping, upload nothing.
 *   --prefix    Restrict to a key prefix (folder) in the S3 bucket.
 *
 * Matching: an S3 object's filename stem is matched to a canonical style key by
 * exact match, then by a normalized (lowercase, non-alnum -> _) comparison.
 * Unmatched objects are reported and skipped — rename them in S3 to match a key.
 */
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// Canonical keys — keep in sync with packages/shared/src/plans.ts BACKGROUND_STYLE_KEYS.
const STYLE_KEYS = [
  'minecraft_parkour', 'subway_surfers', 'soap_cutting_asmr', 'satisfying_loops',
  'abstract_fluid', 'gta_driving', 'kinetic_sand', 'hydraulic_press', 'temple_run', 'lava_lamp',
];

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const SRC_BUCKET = args.bucket || process.env.S3_BACKGROUND_BUCKET;
const PREFIX = args.prefix || '';
const DEST_BUCKET = process.env.BACKGROUND_BUCKET || 'backgrounds';

if (!SRC_BUCKET) {
  console.error('Missing --bucket=<s3-bucket> (or S3_BACKGROUND_BUCKET in .env)');
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const NORM_KEYS = new Map(STYLE_KEYS.map((k) => [norm(k), k]));

/** Map an S3 object key to a canonical style key, or null if no match. */
function matchKey(s3Key) {
  const stem = s3Key.split('/').pop().replace(/\.[^.]+$/, '');
  if (STYLE_KEYS.includes(stem)) return stem;
  return NORM_KEYS.get(norm(stem)) ?? null;
}

async function listMp4s() {
  const objects = [];
  let token;
  do {
    const out = await s3.send(
      new ListObjectsV2Command({ Bucket: SRC_BUCKET, Prefix: PREFIX, ContinuationToken: token }),
    );
    for (const o of out.Contents ?? []) {
      if (/\.mp4$/i.test(o.Key)) objects.push(o.Key);
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function main() {
  const keys = await listMp4s();
  console.log(`Found ${keys.length} .mp4 object(s) in s3://${SRC_BUCKET}/${PREFIX}`);
  if (args.list) {
    for (const k of keys) console.log(`  ${k}  ->  ${matchKey(k) ?? '(no match)'}`);
    return;
  }

  const plan = keys.map((k) => ({ s3Key: k, styleKey: matchKey(k) }));
  const matched = plan.filter((p) => p.styleKey);
  const unmatched = plan.filter((p) => !p.styleKey);

  for (const p of matched) console.log(`  ${p.s3Key}  ->  backgrounds/${p.styleKey}.mp4`);
  for (const p of unmatched) console.warn(`  SKIP (no canonical key match): ${p.s3Key}`);

  if (args['dry-run']) {
    console.log('\nDry run — nothing uploaded.');
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  for (const p of matched) {
    const obj = await s3.send(new GetObjectCommand({ Bucket: SRC_BUCKET, Key: p.s3Key }));
    const body = await streamToBuffer(obj.Body);
    const dest = `${p.styleKey}.mp4`;
    const { error } = await supabase.storage
      .from(DEST_BUCKET)
      .upload(dest, body, { contentType: 'video/mp4', upsert: true });
    if (error) {
      console.error(`  FAILED ${dest}: ${error.message}`);
    } else {
      console.log(`  uploaded backgrounds/${dest} (${(body.length / 1e6).toFixed(1)} MB)`);
    }
  }
  console.log(`\nDone. ${matched.length} uploaded, ${unmatched.length} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
