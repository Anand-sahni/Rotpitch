/**
 * Applies the RotPitch schema + storage migrations to the live Supabase
 * Postgres. Idempotent — safe to re-run.
 *
 *   node --env-file=.env scripts/provision.mjs
 *
 * Handles BOTH cases:
 *   - fresh project  — `public.users` is absent, so the base migrations
 *     (0001 schema/RLS + 0002 signup trigger) run first. These are NOT written
 *     idempotently, so they are applied only when the schema is missing.
 *   - existing project — base migrations are skipped; 0003-0007 re-apply
 *     harmlessly (they are `create or replace` / `on conflict` throughout).
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
// Applied ONLY on a fresh database (no public.users table). Not idempotent.
const BASE_MIGRATIONS = ['0001_init.sql', '0002_signup_trigger.sql'];

// Always applied — idempotent by construction.
const MIGRATIONS = [
  '0003_credit_functions.sql',
  '0004_storage.sql',
  '0005_video_failure_reason.sql',
  '0006_dodo_billing.sql',
  '0007_billing_functions.sql',
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

async function apply(file) {
  const sql = await readFile(join(__dirname, '..', 'packages', 'db', 'migrations', file), 'utf8');
  process.stdout.write(`Applying ${file}… `);
  await client.query(sql);
  console.log('ok');
}

try {
  // A fresh project has no public.users table — lay down the base schema first.
  const { rows } = await client.query(
    "select to_regclass('public.users') is not null as present",
  );
  const hasSchema = rows[0]?.present === true;
  if (hasSchema) {
    console.log('\nBase schema present — skipping 0001/0002.');
  } else {
    console.log('\nFresh database detected — applying base schema.');
    for (const file of BASE_MIGRATIONS) await apply(file);
  }

  for (const file of MIGRATIONS) await apply(file);

  console.log('\nProvisioning complete: schema, credit/billing functions and storage buckets/policies are live.');
  if (!hasSchema) {
    console.log(
      'Fresh project — still to do in the Supabase dashboard:\n' +
        '  1. Auth → Providers → enable Google OAuth\n' +
        '  2. Auth → Email templates → Confirm signup uses {{ .Token }} (see supabase/email-templates/)\n' +
        '  3. Auth → URL Configuration → Site URL + redirect allow-list\n' +
        '  4. pnpm db:gen-types (optional, refreshes db-types.ts)',
    );
  }
} catch (err) {
  console.error('\nProvisioning failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
