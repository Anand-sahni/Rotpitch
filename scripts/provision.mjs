/**
 * Applies the credit-function and storage migrations to the live Supabase
 * Postgres. Idempotent — safe to re-run.
 *
 *   node --env-file=.env scripts/provision.mjs
 *
 * Supabase direct connections (db.<ref>.supabase.co) are IPv6-only and often
 * unreachable, so this derives the Session-mode pooler connection from
 * SUPABASE_DB_URL and tries known regions until one authenticates.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = [
  '0003_credit_functions.sql',
  '0004_storage.sql',
  '0005_video_failure_reason.sql',
];

const raw = process.env.SUPABASE_DB_URL;
if (!raw) {
  console.error('SUPABASE_DB_URL is not set');
  process.exit(1);
}

const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-south-1', 'ap-south-2', 'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3',
  'ap-northeast-1', 'ap-northeast-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2', 'eu-north-1',
  'sa-east-1', 'ca-central-1',
];

function buildCandidates() {
  const u = new URL(raw);
  const ref = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1];
  const password = decodeURIComponent(u.password);
  const candidates = [{ label: 'direct', connectionString: raw }];
  if (ref) {
    for (const prefix of ['aws-0', 'aws-1']) {
      for (const region of REGIONS) {
        const host = `${prefix}-${region}.pooler.supabase.com`;
        candidates.push({
          label: `pooler ${prefix}-${region}`,
          connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:5432/postgres`,
        });
      }
    }
  }
  return candidates;
}

async function tryConnect(connectionString) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 6000,
    query_timeout: 8000,
  });
  await client.connect();
  return client;
}

let client = null;
for (const cand of buildCandidates()) {
  try {
    process.stdout.write(`Trying ${cand.label}… `);
    client = await tryConnect(cand.connectionString);
    console.log('connected');
    break;
  } catch (err) {
    console.log(`no (${err.code || ''} ${err.message})`.trim());
    client = null;
  }
}

if (!client) {
  console.error('\nCould not reach the database on any candidate. Paste the SQL into the Supabase SQL editor instead.');
  process.exit(1);
}

try {
  for (const file of MIGRATIONS) {
    const sql = await readFile(join(__dirname, '..', 'packages', 'db', 'migrations', file), 'utf8');
    process.stdout.write(`Applying ${file}… `);
    await client.query(sql);
    console.log('ok');
  }
  console.log('\nProvisioning complete: credit functions + storage buckets/policies are live.');
} catch (err) {
  console.error('\nProvisioning failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
