# RotPitch — Deployment Guide (Hetzner + Cloudflare R2 backend)

Target topology:

```
 Browser ──HTTPS──► Vercel (apps/web, Next.js)
                          │  presigns R2 GET URLs (R2 read-only token)
                          │  NEXT_PUBLIC_API_URL ──► VPS API
                          ▼
                 Hetzner VPS (docker-compose) ── apps/api/Dockerfile
                    ├── api     (CMD: start, port 4000)        ◄─ HTTP, /health
                    ├── worker  (CMD: start:worker)            ◄─ BullMQ consumer (FFmpeg)
                    └── redis    (redis:7-alpine, volume)      ◄─ BullMQ queue
                          │                  │                 │
              Cloudflare R2 (outputs)   Supabase (Postgres + Auth + Storage)
              private, presigned         raw-uploads / backgrounds
```

**Why this topology:** it replaces AWS, whose cost came from an always-on premium
EC2 instance plus S3 egress. A fixed-price Hetzner VPS (~€7/mo for 4 vCPU / 8 GB)
runs the same `docker-compose` stack unchanged, and Cloudflare R2 stores finished
videos with **zero egress fees** (10 GB free tier). Both the compute layer
(docker-compose) and the storage layer (S3 SDK) port over with no rewrite — R2 is
S3-compatible, so the code just points the `S3Client` at R2's endpoint.

**What stayed:** web on **Vercel**; auth + Postgres + the `raw-uploads` and
`backgrounds` buckets on **Supabase**.

**Scope:** upload → render → download, with auto-captions. Billing
(**Dodo Payments**) is **code-complete** — paid-plan UI exists; checkout is inert
until the owner completes §9. Voiceover is **deferred** ("Coming soon"). See
`CLAUDE.md` for the full status.

---

## 0. Prerequisites

- GitHub repo (Vercel deploys from Git; the VPS pulls the repo).
- Accounts: [Vercel](https://vercel.com), [Hetzner Cloud](https://console.hetzner.cloud),
  [Cloudflare](https://dash.cloudflare.com) (for R2). Supabase project already exists.
- `OPENAI_API_KEY` (for captions). Without it, plain renders work; caption jobs
  fail with a clear reason + auto-refund.

---

## 1. Cloudflare R2 — outputs bucket (private)

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `rotpitch-outputs`).
   R2 buckets are **private by default** (objects are served only via presigned
   URLs — do **not** enable public access / a public dev URL).
2. Note your **Account ID** (R2 overview page). The S3 endpoint is
   `https://<account_id>.r2.cloudflarestorage.com` → this is `S3_ENDPOINT`.
   For R2, `AWS_REGION=auto`.
3. **CORS** — the web embeds the presigned URL in `<video>`/`<a download>`; the
   browser fetches the object directly from R2. Bucket → **Settings → CORS
   policy** → add:
   ```json
   [
     {
       "AllowedOrigins": ["https://<your-vercel-domain>"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Content-Length", "Content-Type"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### R2 API tokens (there is no instance-role concept — use explicit keys)

R2 → **Manage R2 API Tokens** → create tokens. Each yields an
`Access Key ID` + `Secret Access Key` (S3-compatible credentials):

- **Backend token** (api + worker): **Object Read & Write**, scoped to the
  `rotpitch-outputs` bucket → goes in the VPS `.env`.
- **Web token** (read-only): a second token with **Object Read only**, scoped to
  the same bucket → goes in Vercel. The web only ever signs GETs.

---

## 2. Hetzner VPS

1. Hetzner Cloud → **Create Server**:
   - **Image:** Ubuntu 24.04 LTS (matches the Debian-based Dockerfile / `apt`
     ffmpeg with libass).
   - **Type:** at least **CX32** (4 vCPU / 8 GB) — FFmpeg is CPU-bound; the shared
     vCPUs are plenty for short clips. Keep `FFMPEG_THREADS` ≤ the vCPU count.
   - **SSH key:** add yours.
2. Point an **A record** `api.rotpitch.com` → the server's IPv4 *before* you
   start the stack, so Caddy can complete the Let's Encrypt HTTP-01 challenge on
   first boot.
3. SSH in as root and run the bootstrap:
   ```bash
   git clone https://github.com/Anand-sahni/Rotpitch.git /opt/rotpitch
   bash /opt/rotpitch/deploy/hetzner/bootstrap.sh
   ```
   It installs Docker + the compose plugin, configures `ufw` (22/80/443 only),
   symlinks the Caddy TLS overlay to `docker-compose.override.yml`, and creates
   `.env` from the example. It is idempotent and never overwrites an existing
   `.env`.

> **Firewall note.** Only `22`, `80` and `443` are public. The API is **not**
> exposed directly: `docker-compose.yml` binds it to `127.0.0.1:4000` and Caddy
> proxies to it over the compose network. This matters because Docker writes its
> own iptables chain that **bypasses `ufw`** — a `4000:4000` publish would be
> reachable from the internet over plain HTTP no matter what the firewall says.

---

## 3. Deploy the backend (docker-compose)

Fill in `/opt/rotpitch/.env` (see **§5**), then:

```bash
cd /opt/rotpitch && docker compose up -d --build
```

`docker-compose.yml` brings up three services from one image: `redis`, `api`
(loopback `4000`), `worker`; the `docker-compose.override.yml` symlink adds
`caddy` on 80/443 with an automatic TLS cert. Compose overrides `REDIS_URL` to
the in-compose `redis` service, so leave `.env`'s `REDIS_URL` at its default.

Verify on the box, then from outside:
```bash
curl -fsS localhost:4000/health          # on the box
curl -fsS https://api.rotpitch.com/health # once DNS + cert are live
```

Update / redeploy later:
```bash
cd /opt/rotpitch && git pull && docker compose up -d --build
docker compose logs -f worker     # tail render logs
```

---

## 4. Vercel — web (apps/web)

1. Vercel → **Add New → Project** → import the repo.
2. **Framework Preset:** Next.js (auto-detected).
3. **Root Directory:** `apps/web`. Enable "Include files outside root directory"
   if prompted (the workspace `@rotpitch/shared` lives at the repo root).
4. Install/Build commands: leave default. (`transpilePackages` +
   `serverComponentsExternalPackages` in `next.config.mjs` handle the shared
   package and the AWS SDK used to presign R2 URLs.)
5. Add the env vars from **§5**.
6. Deploy. The assigned domain is your `WEB_ORIGIN` (and the R2 CORS origin).

---

## 5. Environment variables

### VPS `.env` (api + worker; loaded by docker-compose)

| Var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service-role** key (server-only) |
| `WEB_ORIGIN` | the Vercel URL — locks CORS |
| `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `AWS_REGION` | `auto` (R2) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | the **read+write** R2 token from §1 |
| `S3_OUTPUT_BUCKET` | `rotpitch-outputs` |
| `OPENAI_API_KEY` | OpenAI key (captions) |
| `OPENAI_TRANSCRIBE_MODEL` | `whisper-1` (optional, default) |
| `RAW_BUCKET` / `BACKGROUND_BUCKET` | optional — defaults `raw-uploads` / `backgrounds` |
| `DODO_PAYMENTS_API_KEY` | Dodo API key (billing) — test_mode key while verifying |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` or `live_mode` |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Dodo webhook signing secret |
| `DODO_PRODUCT_BASIC` / `_POPULAR` / `_PRO` | the `pdt_…` id per plan |

> Billing is **optional to boot**: without these, the API still runs and the
> billing routes return `503`. See §9 for the full Dodo setup.

> `REDIS_URL` is set by docker-compose — don't override it in `.env`.
> `FFMPEG_BIN`/`FFPROBE_BIN` stay unset (the image's libass-enabled
> `ffmpeg`/`ffprobe` on `PATH` are used).

### Vercel (web)

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** key (public) |
| `NEXT_PUBLIC_API_URL` | the VPS API URL (e.g. `https://api.yourdomain.com`) |
| `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `AWS_REGION` | `auto` (R2) |
| `S3_OUTPUT_BUCKET` | `rotpitch-outputs` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | the **read-only** R2 token from §1 |

> Never put the Supabase service-role key in Vercel. The R2 keys here are the
> read-only token — they sign read URLs server-side (Next server runtime); they
> never reach the browser.

---

## 6. Supabase — production auth + storage

1. **Auth → URL Configuration:**
   - **Site URL:** the Vercel domain.
   - **Redirect URLs (allow-list):** add `https://<vercel-domain>/**` and, for
     Google OAuth, the same domain.
2. **Google OAuth (if enabled):** ensure the Supabase callback
   `https://<project>.supabase.co/auth/v1/callback` and the Vercel domain are
   configured in Google Cloud.
3. **Storage buckets:** `raw-uploads` (private) and `backgrounds` (public) are
   still used. The old `outputs` bucket is **no longer written to** (output lives
   in R2) — you can leave it or remove it.
4. Migrations are already applied (`scripts/provision.mjs`).

---

## 7. Cross-wiring checklist

- Vercel `NEXT_PUBLIC_API_URL` → VPS API URL
- VPS `WEB_ORIGIN`             → Vercel domain
- R2 bucket CORS `AllowedOrigins` → Vercel domain

Redeploy Vercel after env changes; `docker compose up -d` to pick up `.env` edits
on the box.

---

## 8. Verify (smoke test)

1. `GET http://<vps>:4000/health` → `{"ok":true,"service":"rotpitch-api"}`.
2. `docker compose logs worker` shows the BullMQ worker connected to Redis (no
   `ECONNREFUSED`).
3. Open the Vercel site → sign up / log in (email + Google) → auth callback lands
   back on the app.
4. Upload a short demo clip → pick a background → **Generate**. Worker logs:
   download → ffmpeg composite → **upload to `rotpitch-outputs/…` (R2)** →
   `videos.status=done`.
5. Video appears in the library and plays/downloads (presigned R2 URL). 1 credit
   deducted.
6. Toggle **captions** on a clip with speech → captions burn in.
7. Force a failure (corrupt upload) → card shows `failure_reason`, credit
   refunded.

---

## 9. Dodo Payments setup (billing)

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

## 10. Known deferrals (not blockers)

- **Billing** (Dodo Payments) — Phase 7, **code-complete**; inert until the owner
  completes the Dodo setup in §9 (account, products, keys, migrations).
- **AI voiceover** — deferred, "Coming soon", rejected server-side.
- **TLS / domain for the API** — the box exposes `:4000`; front it with Caddy or
  nginx + a cert for HTTPS before going public (see `deploy/`).
- **Redis durability** — Redis runs on the box (lives/dies with it) with
  appendonly persistence to a named volume. Move to a managed Redis if you need HA.
- **Brand caption font** — the image installs Liberation (sans fallback).
- **Custom-background orphans** — deleting a video doesn't remove its custom
  background from `raw-uploads`.
- **Legacy outputs** — videos rendered before the object-storage cutover keep a
  full Supabase/S3 URL in `output_url`; readers pass those through unchanged
  (`isAbsoluteUrl`), so old rows keep working after the R2 switch.
