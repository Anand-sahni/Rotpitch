/**
 * Rename mis-named files in the Supabase `backgrounds` bucket to the canonical
 * style keys the render worker + picker expect (`{style_key}.mp4`). Matches each
 * file's stem to a key by exact, then normalized (lowercase, non-alnum -> _).
 *
 * Usage (reads service-role key from root .env):
 *   node --env-file=.env scripts/normalize-backgrounds.mjs --dry-run
 *   node --env-file=.env scripts/normalize-backgrounds.mjs
 */
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.BACKGROUND_BUCKET || 'backgrounds';
const DRY = process.argv.includes('--dry-run');
const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json' };

// Keep in sync with packages/shared/src/plans.ts BACKGROUND_STYLE_KEYS.
const STYLE_KEYS = [
  'minecraft_parkour', 'subway_surfers', 'soap_cutting_asmr', 'satisfying_loops',
  'abstract_fluid', 'gta_driving', 'kinetic_sand', 'hydraulic_press', 'temple_run', 'lava_lamp',
];
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const NORM_KEYS = new Map(STYLE_KEYS.map((k) => [norm(k), k]));

function matchKey(name) {
  const stem = name.replace(/\.[^.]+$/, '');
  if (STYLE_KEYS.includes(stem)) return stem;
  return NORM_KEYS.get(norm(stem)) ?? null;
}

async function listObjects() {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix: '', limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`list ${res.status}: ${await res.text()}`);
  return (await res.json()).filter((o) => o.id !== null && /\.mp4$/i.test(o.name));
}

async function move(sourceKey, destinationKey) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/move`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bucketId: BUCKET, sourceKey, destinationKey }),
  });
  if (!res.ok) throw new Error(`move ${sourceKey} -> ${destinationKey} ${res.status}: ${await res.text()}`);
}

async function main() {
  const objs = await listObjects();
  let renamed = 0;
  for (const o of objs) {
    const key = matchKey(o.name);
    const dest = key ? `${key}.mp4` : null;
    if (!dest) {
      console.warn(`  SKIP (no canonical match): ${o.name}`);
    } else if (dest === o.name) {
      console.log(`  ok (already canonical): ${o.name}`);
    } else {
      console.log(`  ${o.name}  ->  ${dest}${DRY ? '  [dry-run]' : ''}`);
      if (!DRY) {
        await move(o.name, dest);
        renamed++;
      }
    }
  }
  console.log(DRY ? '\nDry run — nothing changed.' : `\nDone. ${renamed} renamed.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
