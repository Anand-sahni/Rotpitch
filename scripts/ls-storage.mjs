/**
 * List objects across all Supabase Storage buckets via the Storage REST API
 * (no supabase-js — avoids the Node-20 realtime WebSocket requirement).
 * Usage: node --env-file=.env scripts/ls-storage.mjs
 */
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json' };

async function listBuckets() {
  const res = await fetch(`${URL_BASE}/storage/v1/bucket`, { headers });
  if (!res.ok) throw new Error(`listBuckets ${res.status}: ${await res.text()}`);
  return res.json();
}

async function listObjects(bucket, prefix = '') {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`list ${bucket} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function walk(bucket, prefix = '') {
  const items = await listObjects(bucket, prefix);
  const out = [];
  for (const item of items) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) out.push(...(await walk(bucket, path))); // folder
    else out.push({ path, size: item.metadata?.size });
  }
  return out;
}

async function main() {
  const buckets = await listBuckets();
  for (const b of buckets) {
    const objs = await walk(b.name);
    console.log(`\n[${b.name}]  (public: ${b.public})`);
    if (objs.length === 0) console.log('  (empty)');
    for (const o of objs) {
      const mb = o.size ? `${(o.size / 1e6).toFixed(1)} MB` : '';
      console.log(`  ${o.path}  ${mb}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
