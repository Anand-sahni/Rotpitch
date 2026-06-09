# RotPitch — Deployment Guide (Phase 9)

Target topology:

```
 Browser ──HTTPS──► Vercel (apps/web, Next.js)
                          │  NEXT_PUBLIC_API_URL
                          ▼
                    Railway (apps/api)
                    ├── service: api     (CMD: start)         ◄─ HTTP, /health
                    └── service: worker  (CMD: start:worker)  ◄─ BullMQ consumer
                          │            │
              Upstash Redis           Supabase (Postgres + Auth + Storage)
              (BullMQ queue)          raw-uploads / outputs / backgrounds
```

**Scope of this deploy:** upload → render → download, with auto-captions. Billing
(Stripe/Razorpay) is **not built** — paid-plan UI exists but checkout is inert.
Voiceover is **deferred** ("Coming soon"). Output storage stays on **Supabase**
(S3 deferred). See `CLAUDE.md` for the full status.

---

## 0. Prerequisites

- GitHub repo (the code must be pushed — Vercel & Railway deploy from Git).
- Accounts: [Vercel](https://vercel.com), [Railway](https://railway.app),
  [Upstash](https://upstash.com). Supabase project already exists.
- `OPENAI_API_KEY` (for captions). Without it, plain renders work; caption jobs
  fail with a clear reason + auto-refund.

---

## 1. Push to GitHub

```bash
git add .
git commit -m "chore: deployment config (Dockerfile, prod start, deploy guide)"
git branch -M main
git remote add origin git@github.com:<you>/rotpitch.git   # or https://…
git push -u origin main
```

`.env` is gitignored — confirm it is NOT in the push (`git ls-files | grep '\.env$'`
should print nothing).

---

## 2. Upstash Redis (BullMQ queue)

1. Upstash console → **Create Database** → Redis. Pick a region near your Railway
   region. Enable **TLS**.
2. Open the DB → **Details** → copy the **Redis connect URL** (the `rediss://…`
   endpoint, **not** the REST URL). This is `REDIS_URL`.

> BullMQ uses a raw Redis connection, not the REST API. The `rediss://` (TLS)
> scheme is correct for Upstash.

---

## 3. Railway — API + worker (one repo, one Dockerfile, two services)

Both services build from `apps/api/Dockerfile` with the **repo root** as build
context. They share identical env vars and differ only in the start command.

### 3a. Create the API service
1. Railway → **New Project** → **Deploy from GitHub repo** → select the repo.
2. Service **Settings → Build**:
   - Builder: **Dockerfile**
   - Dockerfile Path: `apps/api/Dockerfile`
   - (Root Directory stays the repo root — the Dockerfile copies the whole
     workspace.)
3. Service **Settings → Deploy**:
   - Start Command: *(leave empty — image default is the API: `start`)*
   - Health Check Path: `/health`
4. Add the env vars from **§5** below.
5. Networking → **Generate Domain**. This URL is your `NEXT_PUBLIC_API_URL`.

### 3b. Create the worker service
1. In the same project → **New → GitHub Repo** → same repo (a second service).
2. Build settings: identical Dockerfile config as 3a.
3. Deploy → **Start Command**: `pnpm --filter @rotpitch/api start:worker`
4. Same env vars as the API (copy them). No domain / no health check needed —
   it's a background consumer.

> Why two services: the Express API and the BullMQ render worker are separate
> long-running processes. They scale independently and the worker has no HTTP
> surface.

---

## 4. Vercel — web (apps/web)

1. Vercel → **Add New → Project** → import the repo.
2. **Framework Preset:** Next.js (auto-detected).
3. **Root Directory:** `apps/web`. Enable "Include files outside root directory"
   if prompted (the workspace `@rotpitch/shared` lives at the repo root).
4. Install/Build commands: leave default — Vercel detects the pnpm workspace and
   runs `next build`. (`transpilePackages: ['@rotpitch/shared']` in
   `next.config.mjs` handles the shared TS package.)
5. Add the env vars from **§5**.
6. Deploy. The assigned domain (e.g. `https://rotpitch.vercel.app`) is your
   `WEB_ORIGIN`.

---

## 5. Environment variables

### Railway (both `api` and `worker` services — identical set)

| Var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service-role** key (server-only) |
| `WEB_ORIGIN` | the Vercel URL (e.g. `https://rotpitch.vercel.app`) — locks CORS |
| `REDIS_URL` | Upstash `rediss://…` connect URL |
| `OPENAI_API_KEY` | OpenAI key (captions) |
| `OPENAI_TRANSCRIBE_MODEL` | `whisper-1` (optional, default) |
| `RAW_BUCKET` / `OUTPUT_BUCKET` / `BACKGROUND_BUCKET` | optional — defaults `raw-uploads` / `outputs` / `backgrounds` |

> Do **not** set `API_PORT` — Railway injects `$PORT` and the server binds to it.
> `FFMPEG_BIN`/`FFPROBE_BIN` are unset (the image's `ffmpeg`/`ffprobe` on `PATH`,
> built with libass, are used).

### Vercel (web)

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** key (public) |
| `NEXT_PUBLIC_API_URL` | the Railway **api** service domain |

> Never put the service-role key in Vercel — it would ship to the browser.

---

## 6. Supabase — production auth + storage

1. **Auth → URL Configuration:**
   - **Site URL:** the Vercel domain.
   - **Redirect URLs (allow-list):** add
     `https://<vercel-domain>/**` (covers email-confirm + password-reset
     callbacks) and, for Google OAuth, the same domain.
2. **Google OAuth (if enabled):** in Google Cloud console add the Supabase
   callback `https://<project>.supabase.co/auth/v1/callback` (usually already
   set) and ensure the Vercel domain is an authorized origin.
3. **Storage buckets** already exist (`raw-uploads` private, `outputs` public,
   `backgrounds` public) via `0004_storage.sql`. No change needed.
4. Migrations are already applied to this project (`scripts/provision.mjs`).

---

## 7. Cross-wiring checklist

The two URLs reference each other — set them after both platforms assign domains:

- Vercel `NEXT_PUBLIC_API_URL`  → Railway **api** domain
- Railway `WEB_ORIGIN`          → Vercel domain

Redeploy each side after setting (env changes need a rebuild on Vercel; Railway
redeploys on var change).

---

## 8. Verify (smoke test)

1. `GET https://<railway-api>/health` → `{"ok":true,"service":"rotpitch-api"}`.
2. Railway **worker** logs show the BullMQ worker connected to Upstash (no
   `ECONNREFUSED`).
3. Open the Vercel site → sign up / log in (email + Google) → confirm the auth
   callback lands back on the app.
4. Upload a short demo clip → pick a background → **Generate**. Watch the worker
   logs: download → ffmpeg composite → upload to `outputs` → `videos.status=done`.
5. Video appears in the library and downloads. 1 credit deducted.
6. Toggle **captions** on a clip with speech → captions burn in (confirms
   `OPENAI_API_KEY` + libass + fonts in the image).
7. Force a failure (e.g. a corrupt upload) → card shows `failure_reason` and the
   credit is refunded.

---

## 9. Known deferrals (not blockers for this deploy)

- **Billing** (Stripe + Razorpay) — Phase 7, not built. Checkout is inert.
- **AI voiceover** — deferred, shown as "Coming soon" and rejected server-side.
- **S3 output** — outputs stay in Supabase Storage; swap `OUTPUT_BUCKET` +
  `uploadFrom` to S3 when productionizing.
- **Brand caption font** — the image installs Liberation (sans fallback);
  bundling a brand font + `fontsdir` is a polish follow-up.
- **Custom-background orphans** — deleting a video doesn't remove its custom
  background from `raw-uploads`.
