# RotPitch — Deployment Guide (Railway + Supabase Storage)

Live topology (as of 2026-08-30):

```
 Browser ──HTTPS──► Vercel (apps/web, Next.js)  ·  rotpitch.com
                          │  presigns Supabase S3 GET URLs (server-side)
                          │  NEXT_PUBLIC_API_URL ──► https://api.rotpitch.com
                          ▼
                    Railway project "powerful-art"
                    ├── Rotpitch  (api,    Dockerfile, public domain, /health)
                    ├── worker    (BullMQ consumer, FFmpeg, no HTTP)
                    └── Redis     (BullMQ queue, persistent volume)
                          │
                    Supabase — Postgres + Auth + ALL storage
                      raw-uploads (private) · backgrounds (public) · outputs (PRIVATE, presigned)
```

**Why this shape.** It uses only accounts that already existed. Compute is Railway
(which ran this stack in Phase 9). Finished renders live in Supabase Storage via
its **S3-compatible endpoint**, so the existing `@aws-sdk/client-s3` code works
with nothing but an endpoint + region + key change. AWS (EC2 + S3) and the
planned Hetzner + Cloudflare R2 topology are both retired — see `TASKS.md`
Phase 11 for why.

**Scope:** upload → render → download, with auto-captions. Billing (Dodo) is
code-complete but **inert** (`/health` reports `billing:false`). Voiceover is
deferred ("Coming soon").

---

## 0. Prerequisites

- Accounts: **Vercel**, **Railway**, **Supabase** (all already provisioned).
- `OPENAI_API_KEY` for captions. Without it plain renders work; caption jobs fail
  with a clear reason and auto-refund the credit.
- Domain DNS is managed at **Spaceship** (registrar-hosted).

---

## 1. Supabase Storage — outputs over the S3 protocol

1. Supabase → **Storage → S3** (`/storage/s3`). Ensure **S3 protocol connection**
   is enabled. Note the **Endpoint** and **Region** shown there:
   - `S3_ENDPOINT=https://<project_ref>.storage.supabase.co/storage/v1/s3`
   - `AWS_REGION=<project region>` (this project: `ap-northeast-2`)
2. **Access keys** → *New access key*. The secret is shown **once** — capture it.
   These become `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
3. The **`outputs` bucket must be PRIVATE.** Every read is presigned by the app.

> **Security — two things that matter here.**
> 1. **Never authenticate the S3 client with a session token.** Supabase accepts
>    `accessKeyId=<project_ref>`, `secretAccessKey=<anon>`, `sessionToken=<service_role>`,
>    and it works — but `getSignedUrl` then puts the service-role key into the URL
>    as `X-Amz-Security-Token`. Every video link would leak full DB access. Use a
>    real S3 access key, which signs cleanly with no token parameter.
> 2. Supabase S3 access keys are **all-buckets and bypass RLS**; there is no
>    read-only scope. The key on Vercel is therefore more privileged than it
>    should be. Tracked as a follow-up in `TASKS.md`.

---

## 2. Railway — api + worker + Redis

One project, three services. Both app services build the **same**
`apps/api/Dockerfile` from the repo root on branch `main`.

| Service | Builder | Start command | Notes |
|---|---|---|---|
| `Rotpitch` (api) | Dockerfile `/apps/api/Dockerfile` | image default (`start`) | public domain, `/health` |
| `worker` | Dockerfile `/apps/api/Dockerfile` | `pnpm --filter @rotpitch/api start:worker` | no HTTP |
| `Redis` | Railway Redis | — | persistent volume; referenced as `${{Redis.REDIS_URL}}` |

**Port gotcha:** Railway injects its own `PORT` (8080), but a generated domain
targets the port you gave it. If they disagree you get **502s** with the app
logging `listening on :8080`. Fix by pinning `PORT=4000` to match the domain
target (what this deployment does).

Deploys are git-push driven off `main`. From the CLI:

```bash
npx @railway/cli login
npx @railway/cli link --project <project-id> --environment production
npx @railway/cli variables --service Rotpitch --set "KEY=value"
npx @railway/cli redeploy --service Rotpitch --yes
npx @railway/cli logs --service worker
```

---

## 3. Vercel — web (apps/web)

Root directory `apps/web`, Next.js preset, deploys from `main`. Needs the storage
env below because it presigns output URLs **server-side** (`apps/web/lib/s3.ts`);
no storage credentials ever reach the browser.

```bash
cd apps/web && npx vercel link --project rotpitch-web
npx vercel env add S3_ENDPOINT production
npx vercel redeploy <deployment-url>
```

---

## 4. DNS (Spaceship)

| Host | Type | Value |
|---|---|---|
| `@` | A | `216.198.79.1` (Vercel) |
| `www` | CNAME | `cname.vercel-dns.com` |
| `api` | CNAME | `<id>.up.railway.app` (from Railway custom-domain setup) |
| `_railway-verify.api` | TXT | `railway-verify=…` (ownership proof) |

Add the custom domain in Railway first — it prints both records. `api` must be a
**CNAME**, so the old A record has to be replaced, not kept alongside.

---

## 5. Environment variables

**Railway — both `Rotpitch` and `worker` need the identical set:**

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` (api only; must match the domain target) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (**server only**) |
| `WEB_ORIGIN` | `https://rotpitch.com` (CORS allow-list) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (Railway reference — leave literal) |
| `RAW_BUCKET` / `BACKGROUND_BUCKET` | `raw-uploads` / `backgrounds` |
| `S3_ENDPOINT` | `https://<ref>.storage.supabase.co/storage/v1/s3` |
| `AWS_REGION` | `ap-northeast-2` |
| `S3_OUTPUT_BUCKET` | `outputs` |
| `S3_PRESIGN_EXPIRES_SEC` | `3600` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Supabase S3 access key pair |
| `OPENAI_API_KEY` | captions (optional) |
| `FFMPEG_THREADS` | `2` — see the OOM note below |
| `RENDER_CONCURRENCY` | `1` — peak memory scales linearly with this |
| `FFMPEG_RC_LOOKAHEAD` | `10` |
| `RENDER_TIMEOUT_MS` | `180000` |

**Vercel (Production + Preview):** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=https://api.rotpitch.com`,
`S3_ENDPOINT`, `AWS_REGION`, `S3_OUTPUT_BUCKET`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`. **Never** put `SUPABASE_SERVICE_ROLE_KEY` here.

> **ffmpeg OOM:** in a container ffmpeg sees the host's full core count and x264
> pre-allocates per-thread lookahead buffers at 1080×1920 — multiple GB, then the
> kernel kills it the instant encoding starts. `FFMPEG_THREADS` caps
> `-threads` and `-filter_complex_threads`. Clips are short, so throughput is
> unaffected. Do not raise it without raising the instance memory.

---

## 6. Supabase — auth configuration

- **Auth → URL Configuration:** Site URL `https://rotpitch.com`, redirect
  allow-list including `https://rotpitch.com/**`.
- **Auth → Providers:** Google OAuth enabled.
- **Auth → Email templates:** *Confirm signup* uses `{{ .Token }}` (6-digit OTP,
  not a magic link — see `supabase/email-templates/`).
- Migrations: `node --env-file=.env scripts/provision.mjs` (idempotent; also
  bootstraps `0001`/`0002` on a fresh project).

---

## 7. Verify (smoke test)

```bash
curl https://api.rotpitch.com/health          # {"ok":true,"service":"rotpitch-api",...}
curl -o /dev/null -w '%{http_code}\n' https://rotpitch.com        # 200
curl -o /dev/null -w '%{http_code}\n' https://rotpitch.com/app    # 307 -> /login
```

Then the real one: sign up → upload a 5–10 s clip → pick a background → Generate.
Expect `pending → processing → done` in ~10–15 s, 1 credit deducted, and a
downloadable 1080×1920 H.264+AAC file with the free-plan watermark. Confirm the
presigned URL returns **200** and that the raw object URL **without** a signature
returns **400** (proves the bucket is private).

---

## 8. Dodo Payments setup (billing)

Code is complete (hosted checkout + customer portal + signed webhooks). To turn
billing on, do the owner steps below. Dodo is the **Merchant of Record** — it
handles global cards + local methods (incl. India INR) and remits tax, so there's
no separate Stripe/Razorpay account.

1. **Account + products.** Create a Dodo Payments account. Create **3 subscription
   products** — Basic ($9.99/mo), Popular ($19.99/mo), Pro ($49.99/mo) — and note
   each `product_id` (`pdt_…`). (Prices/credits are defined in
   `packages/shared/src/plans.ts`; keep the Dodo product prices in sync.)
2. **API key.** Dashboard → Developer → API keys. Use a **test_mode** key first.
3. **Webhook.** Dashboard → Developer → Webhooks → add endpoint
   `https://api.rotpitch.com/api/webhooks/dodo`. Subscribe to the **subscription**
   events (`subscription.active`, `.renewed`, `.plan_changed`, `.on_hold`,
   `.cancelled`, `.expired`, `.failed`). Copy the **signing secret**.
4. **VPS `.env`** (see §5): set `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_ENVIRONMENT`
   (`test_mode`), `DODO_PAYMENTS_WEBHOOK_KEY`, and `DODO_PRODUCT_BASIC/_POPULAR/_PRO`.
   `docker compose up -d` to reload.
5. **Apply DB migrations** (adds the gateway enum/`dodo_customer_id`/webhook table
   + billing functions): `node --env-file=.env scripts/provision.mjs` (idempotent;
   applies `0006` + `0007`).
6. **Verify (test_mode).** On `/app/billing`, click **Upgrade** → complete Dodo's
   test checkout → land back on `?status=success`. Confirm: the webhook hit
   (`docker compose logs api`), `users.plan` + `credits_balance` updated, a
   `purchase` row in `credit_transactions`, a `subscriptions` row. Then open
   **Manage billing** → the Dodo portal loads. Cancel → on expiry the user drops
   to Free.
7. **Go live.** Swap the API key to a **live_mode** key, set
   `DODO_PAYMENTS_ENVIRONMENT=live_mode`, re-point the webhook secret to the live
   endpoint, and use live `product_id`s.

> **Source of truth = webhooks.** The checkout `return_url` (`?status=success`) is
> cosmetic; credits/plan are only granted by the verified webhook. A redelivery is
> deduped by `webhook-id` (the `dodo_webhook_events` table).

---


---

## 9. Known deferrals (not blockers)

- **Railway trial** — "30 days or $5.00". A paid plan is required to stay online.
- **Supabase free-tier egress** is the scaling ceiling; every video view counts.
- **Billing inert** — needs test-mode Dodo keys + products (§8).
- **Voiceover** — "Coming soon", rejected server-side on every path.
- **Per-job progress %** — cosmetic at ~12 s renders.
- **Caption font** — libass falls back to the container's `fonts-liberation`;
  bundling a brand font + `fontsdir` is still open.
- **Least-privilege storage key on Vercel** — see §1.
- `docker-compose.yml` + `deploy/Caddyfile` are retained for **local / self-host**
  use only; Railway builds the Dockerfile directly and does not use compose.
- `deploy/aws/` is obsolete reference from the retired EC2 deployment.
