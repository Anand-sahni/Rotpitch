# RotPitch — Deployment Guide (AWS backend)

Target topology:

```
 Browser ──HTTPS──► Vercel (apps/web, Next.js)
                          │  presigns S3 GET URLs (AWS read creds)
                          │  NEXT_PUBLIC_API_URL ──► EC2 API
                          ▼
                    EC2 (docker-compose) ── apps/api/Dockerfile
                    ├── api     (CMD: start, port 4000)        ◄─ HTTP, /health
                    ├── worker  (CMD: start:worker)            ◄─ BullMQ consumer (FFmpeg)
                    └── redis    (redis:7-alpine, volume)      ◄─ BullMQ queue
                          │                  │                 │
                   AWS S3 (outputs)   Supabase (Postgres + Auth + Storage)
                   private, presigned  raw-uploads / backgrounds
```

**What moved to AWS:** the API + worker (Railway → **EC2 + docker-compose**), the
queue (Upstash → **Redis container on the box**), and finished-video output
(Supabase `outputs` bucket → **private S3 bucket, presigned GET**).

**What stayed:** web on **Vercel**; auth + Postgres + the `raw-uploads` and
`backgrounds` buckets on **Supabase**.

**Scope:** upload → render → download, with auto-captions. Billing
(Stripe/Razorpay) is **not built** — paid-plan UI exists but checkout is inert.
Voiceover is **deferred** ("Coming soon"). See `CLAUDE.md` for the full status.

---

## 0. Prerequisites

- GitHub repo (Vercel deploys from Git; the EC2 box pulls the repo).
- Accounts: [Vercel](https://vercel.com), AWS (EC2 + S3 + IAM). Supabase project
  already exists.
- `OPENAI_API_KEY` (for captions). Without it, plain renders work; caption jobs
  fail with a clear reason + auto-refund.

---

## 1. AWS S3 — outputs bucket (private)

1. S3 → **Create bucket** (e.g. `rotpitch-outputs`), region of your choice
   (this is `AWS_REGION`). **Block all public access = ON** (objects are served
   only via presigned URLs).
2. **CORS** — the web embeds the presigned URL in `<video>`/`<a download>`; the
   browser fetches the object directly from S3. Add a CORS rule allowing your
   Vercel origin:
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
3. No bucket policy needed — access is entirely via presigned URLs.

### IAM

- **EC2 role** (api + worker): `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`
  on `arn:aws:s3:::rotpitch-outputs/*`. Attach as an **instance profile** so the
  containers get creds from the metadata endpoint — no keys in `.env`.
- **Vercel user** (web, read-only): an IAM user with only `s3:GetObject` on
  `arn:aws:s3:::rotpitch-outputs/*`. Generate an access key → set as Vercel env
  (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`). The web only ever signs GETs.

---

## 2. EC2 instance

1. Launch an instance — **Ubuntu 24.04 LTS** AMI (matches the Debian-based
   Dockerfile and `apt` ffmpeg with libass). Size for FFmpeg: at least
   **t3.large** (2 vCPU / 8 GB); a `c`-class is better if encoding is the
   bottleneck. Keep `FFMPEG_THREADS` ≤ the vCPU count.
2. **Attach the EC2 IAM role** from §1 (instance profile).
3. **Security group:** inbound `22` (SSH, your IP), and `4000` (API) from the
   internet — or, better, put the API behind an ALB / nginx + TLS and expose
   `443` only. Outbound: all (S3, Supabase, OpenAI).
4. SSH in and install Docker:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
   sudo usermod -aG docker $USER   # re-login to take effect
   ```

---

## 3. Deploy the backend (docker-compose)

```bash
git clone https://github.com/<you>/rotpitch.git && cd rotpitch
cp .env.example .env        # then edit .env — see §5
docker compose up -d --build
```

`docker-compose.yml` brings up three services from one image: `redis`, `api`
(port 4000), `worker`. It overrides `REDIS_URL` to the in-compose `redis`
service, so leave `.env`'s `REDIS_URL` at its default.

Update / redeploy later:
```bash
git pull && docker compose up -d --build
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
   package and the AWS SDK.)
5. Add the env vars from **§5**.
6. Deploy. The assigned domain is your `WEB_ORIGIN` (and the S3 CORS origin).

---

## 5. Environment variables

### EC2 `.env` (api + worker; loaded by docker-compose)

| Var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service-role** key (server-only) |
| `WEB_ORIGIN` | the Vercel URL — locks CORS |
| `AWS_REGION` | the outputs bucket region |
| `S3_OUTPUT_BUCKET` | `rotpitch-outputs` |
| `OPENAI_API_KEY` | OpenAI key (captions) |
| `OPENAI_TRANSCRIBE_MODEL` | `whisper-1` (optional, default) |
| `RAW_BUCKET` / `BACKGROUND_BUCKET` | optional — defaults `raw-uploads` / `backgrounds` |

> `REDIS_URL` is set by docker-compose — don't override it in `.env`.
> `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are **unset** when using the EC2
> instance role (recommended). `FFMPEG_BIN`/`FFPROBE_BIN` stay unset (the image's
> libass-enabled `ffmpeg`/`ffprobe` on `PATH` are used).

### Vercel (web)

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** key (public) |
| `NEXT_PUBLIC_API_URL` | the EC2 API URL (e.g. `https://api.yourdomain.com`) |
| `AWS_REGION` | the outputs bucket region |
| `S3_OUTPUT_BUCKET` | `rotpitch-outputs` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | the **read-only** IAM user from §1 |

> Never put the Supabase service-role key in Vercel. The AWS keys here are
> scoped to `s3:GetObject` only — they sign read URLs server-side (Next server
> runtime); they never reach the browser.

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
   in S3) — you can leave it or remove it.
4. Migrations are already applied (`scripts/provision.mjs`).

---

## 7. Cross-wiring checklist

- Vercel `NEXT_PUBLIC_API_URL` → EC2 API URL
- EC2 `WEB_ORIGIN`            → Vercel domain
- S3 bucket CORS `AllowedOrigins` → Vercel domain

Redeploy Vercel after env changes; `docker compose up -d` to pick up `.env` edits
on the box.

---

## 8. Verify (smoke test)

1. `GET http://<ec2>:4000/health` → `{"ok":true,"service":"rotpitch-api"}`.
2. `docker compose logs worker` shows the BullMQ worker connected to Redis (no
   `ECONNREFUSED`).
3. Open the Vercel site → sign up / log in (email + Google) → auth callback lands
   back on the app.
4. Upload a short demo clip → pick a background → **Generate**. Worker logs:
   download → ffmpeg composite → **upload to `s3://rotpitch-outputs/…`** →
   `videos.status=done`.
5. Video appears in the library and plays/downloads (presigned S3 URL). 1 credit
   deducted.
6. Toggle **captions** on a clip with speech → captions burn in.
7. Force a failure (corrupt upload) → card shows `failure_reason`, credit
   refunded.

---

## 9. Known deferrals (not blockers)

- **Billing** (Stripe + Razorpay) — Phase 7, not built. Checkout is inert.
- **AI voiceover** — deferred, "Coming soon", rejected server-side.
- **TLS / domain for the API** — the box exposes `:4000`; front it with an ALB or
  nginx + a cert for HTTPS before going public.
- **ElastiCache** — Redis runs on the box (lives/dies with it). Move to
  ElastiCache if you need HA / durability.
- **Brand caption font** — the image installs Liberation (sans fallback).
- **Custom-background orphans** — deleting a video doesn't remove its custom
  background from `raw-uploads`.
- **Legacy outputs** — videos rendered before the S3 cutover keep their Supabase
  public URL in `output_url`; readers pass those through unchanged.
