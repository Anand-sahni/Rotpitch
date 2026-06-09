# RotPitch — Project Memory (CLAUDE.md)

> Persistent project context for Claude Code. Keep this updated as the build progresses.
> Source of truth: `RotPitch_Spec_and_Design_System.html` (PRD v2.0 · Design System v1.0) + the build brief.
> Status: **IN BUILD** — Phases 1 (foundation, DB, shared, design system, full auth, all app screens), 4 + 5 (render pipeline) are done; render verified end-to-end (upload → FFmpeg composite → Supabase output → done, 1 credit deducted/refunded). Background loops live in the Supabase `backgrounds` bucket named `{style_key}.mp4` (picker preview + worker read the same file). Upload validation now enforced in 3 layers (client type/size/≤60s · `raw-uploads` bucket MIME+50 MB cap · worker `ffprobe` re-check → `videos.failure_reason` shown on failed cards). Owner gameplay asset pack uploaded. **Auto-captions are live** (Phase 6, part 1): worker transcribes the demo audio via OpenAI Whisper and burns styled captions in with libass (`subtitles` filter); verified end-to-end through the real render path (live Whisper HTTP call pending an `OPENAI_API_KEY` in `.env`). **Phase 9 (deploy) is DONE** — live in prod and verified end-to-end (2026-06-09): web on **Vercel** (`rotpitch-web.vercel.app`), API + worker on **Railway**, Redis on **Upstash** (TLS), DB/Auth/Storage on **Supabase**. Remaining/deferred: per-job progress % (cosmetic at ~8 s renders), S3 output for prod (deferred — still on Supabase `outputs`); not started: Phase 6 voiceover (ElevenLabs), 7 (Stripe + Razorpay billing — checkout inert at launch). See `TASKS.md` for granular status.

---

## 1. Product

RotPitch is a **web SaaS that turns a product demo video into a viral split-screen social clip with zero editing**. The user uploads footage, picks a high-retention background (gameplay / ASMR / abstract loops), optionally adds auto-captions and AI voiceover, and exports a ready-to-post 9:16 or 16:9 video.

**Core loop:** Upload → Generate → Download → Post.

Positioning: not a video editor — a *growth tool that happens to output video*. Competes on speed and zero skill, not creative control.

Target users: indie hackers / solo founders, mobile app devs, e-commerce / DTC brands, digital product creators.

---

## 2. Tech Stack (authoritative — flag before deviating)

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm + TypeScript (**strict**) |
| Frontend | Next.js 14 (App Router) + React + Tailwind CSS → deploy **Vercel** |
| Backend | Node.js + Express (video API + workers) → deploy **Railway** |
| DB / Auth / raw storage | Supabase (Postgres, RLS, Supabase Auth email + Google OAuth, Supabase Storage for raw uploads) |
| Output storage | AWS S3 (finished videos) |
| Queue | BullMQ + Redis (Upstash OK) — async render, retries, **priority lane for Pro** |
| Video processing | FFmpeg (composite product + background, burn captions, mux voiceover, watermark) |
| Captions | OpenAI Whisper |
| Voiceover | ElevenLabs |
| Payments | Stripe (intl / USD) + Razorpay (India / INR) |

---

## 3. Monorepo Structure (target)

```
apps/
  web/                 Next.js 14 (App Router) frontend
    app/               routes, layouts, route groups
    components/        reusable UI
    lib/               supabase client, theme tokens, api client
  api/                 Express backend (video processor)
    routes/            REST handlers
    workers/           BullMQ worker definitions
    services/          ffmpeg, whisper, elevenlabs, s3, stripe, razorpay wrappers
packages/
  db/                  Supabase schema, SQL migrations, generated types
  shared/              shared TS types, zod schemas, constants (plans, credits)
turbo.json
```

---

## 4. Plans & Gating

| Feature | Free | Basic $9.99 | Popular $19.99 | Pro $49.99 |
|---|---|---|---|---|
| Monthly credits | 1 (never expires) | 20 | 40 | 100 |
| Credit expiry | Never | Monthly | Monthly | Monthly |
| Background styles | 5 only | all | all | all |
| Auto captions | ❌ | ✅ | ✅ | ✅ |
| AI voiceover | ❌ | ❌ | ✅ | ✅ |
| Vertical 9:16 | ✅ | ✅ | ✅ | ✅ |
| Horizontal 16:9 | ❌ | ❌ | ✅ | ✅ |
| Watermark | Always | None | None | None |
| Auto Generate (2–5) | ❌ | ✅ | ✅ | ✅ |
| Priority render queue | ❌ | ❌ | ❌ | ✅ |

Popular is the highlighted ("Most Popular") plan.

---

## 5. Credit System

- **1 credit per rendered video** — single generate or batch, same cost.
- **Auto Generate:** min 2, max 5 videos; **all credits deducted upfront** before rendering.
- A batch is **blocked entirely** if the user can't cover all of it.
- **Failed render → auto-refund 1 credit immediately** and log it. Support can issue manual refunds as fallback.
- **Lazy expiry:** on every credit-consuming request, if `credits_expires_at` is in the past, reset balance to plan default and recompute expiry (no cron required for baseline). **Free credits never expire.**
- Every credit change is recorded in `credit_transactions`.
- All credit mutations go through **one `creditService`** (deduct / refund / reset) that always writes a `credit_transactions` row, wrapped in a DB transaction to avoid races.

---

## 6. Render Pipeline

`upload → validate → deduct credit(s) → enqueue (BullMQ) → worker runs FFmpeg (composite + optional captions/voiceover + watermark for free) → upload output to S3 → mark videos.status = done → appears in dashboard`

On failure: `status = failed`, refund credit.

Auto Generate: N independent jobs (one background style per slot) run in parallel through the same pipeline; each completed video lands in the dashboard, each failure refunds its own credit.

---

## 7. Billing Lifecycle

- **New sub:** credits added immediately; billing cycle starts.
- **Upgrade:** immediate; credits topped to new plan amount.
- **Downgrade:** at end of current billing cycle.
- **Cancel:** access until cycle end, then drop to Free.
- **Renewal:** wipe old credits, add fresh plan credits. **No rollover.**
- **Failed payment:** 3-day grace, then suspend.
- **Webhooks:** verify all signatures; dedupe by event id (idempotent); return 2xx fast.

Gateways: Razorpay (India, INR, PAN+bank KYC) · Stripe (intl, USD/multi-currency, business entity KYC).

---

## 8. Database Schema (Supabase / Postgres — RLS on all user-scoped tables)

**users**: `id uuid PK (= auth uid)`, `email text unique`, `plan enum(free|basic|popular|pro)`, `credits_balance int`, `credits_expires_at timestamptz null`, `billing_cycle_start timestamptz null`, `created_at`.

**videos**: `id uuid PK`, `user_id FK`, `status enum(pending|processing|done|failed)`, `input_url text`, `output_url text null`, `background_style text`, `format enum(vertical|horizontal)`, `has_captions bool`, `has_voiceover bool`, `has_watermark bool`, `batch_id uuid null`, `created_at`.

**credit_transactions**: `id uuid PK`, `user_id FK`, `amount int (+add / −deduct)`, `type enum(signup|purchase|use|refund)`, `video_id FK null`, `payment_id text null`, `created_at`.

**subscriptions**: `id uuid PK`, `user_id FK`, `plan enum(basic|popular|pro)`, `payment_gateway enum(razorpay|stripe)`, `gateway_subscription_id text`, `status enum(active|cancelled|past_due)`, `current_period_start`, `current_period_end`.

---

## 9. Core API Routes (Express)

- `POST /api/videos/generate`
- `POST /api/videos/auto-generate`
- `GET  /api/videos`
- `GET  /api/videos/:id`
- `POST /api/credits/purchase`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/razorpay`
- `GET  /api/user/credits`

Auth middleware validates the Supabase JWT and loads the user. **Never trust the client for plan/credit/gating decisions — enforce server-side.**

---

## 10. Design System

**Theme:** dark, premium, creator-first (Linear × Framer × Raycast × Arc). Three swappable themes via CSS custom properties on `:root`: **Studio Dark** (default), **Daylight** (light), **Hypergloss** (neon, marketing).

**Colors**
- Base `#09090B` · surface `#0F0F12` · card `#151519` · elevated `#1C1C22` · border `#26262E` · border-strong `#35353F` · glass `rgba(18,18,23,.66)`
- Text: primary `#F4F4F6` · secondary `#9E9EA9` · muted `#66666F` · disabled `#45454D`
- Accent — **Volt Lime** `#CBFF3D` (hover `#B8F02A`), dim `rgba(203,255,61,.14)`
- Gradients: **Signal** `#CBFF3D → #3DF0C8` (actions/progress) · **Nebula** `#9D7BFF → #FF5C9D` (premium/upgrade) · **Aurora** `#9D7BFF → #3DF0C8 → #CBFF3D` (hero only). Never mix two gradients on one surface.
- Semantic: success `#46E08F` · warning `#FFB23E` · error `#FF5C5C` · info `#4DA8FF`

**Fonts:** display **Syne** (Google Fonts) — headings/logo · UI **DM Sans** (Google Fonts) — body/buttons · mono **JetBrains Mono** (Google Fonts) — credits/metadata/timestamps. All free for commercial use. _(Adopted from the authoritative Google Stitch design — see Decisions Log. Syne stands in for the original Clash Display direction, DM Sans for Satoshi.)_

**Radius:** `--r-xs 6px · --r-sm 10px (controls) · --r-md 14px · --r-lg 20px (cards) · --r-xl 28px · --r-full 999px (pills)`.

**Other tokens:** button heights sm 34 / md 44 / lg 52; input 44px; shadows sm/md/lg + volt `glow`; **4px spacing grid**; containers 1200px app / 920px docs / 1320px marketing; 12-col grid, 24px gutter, single column < 980px.

**Components:** primary button = Signal gradient + soft volt glow (radius 10px, weight 700, −1px hover lift). Premium = Nebula. Else ghost. Thin 1.5px line icons (Lucide). Frosted-glass (`blur(18px)`) top nav + modals only. Inputs on base color, border turns volt on focus + soft focus ring. Upload dropzone is the emotional center — generous dashed zone, glows volt on hover.

**Expose all tokens as CSS variables + a Tailwind theme** so screens stay consistent.

---

## 11. Engineering Conventions

- **TypeScript strict everywhere**; no `any` without a comment justifying it.
- Shared types, zod schemas, and plan/credit constants live in **`packages/shared`** — imported by both apps, never duplicated.
- **Validate all API input with zod.** Never trust the client for gating.
- Secrets only on the server. Supabase **anon key** client-side; **service-role key only in `apps/api`**. Never expose service keys to the browser.
- All credit mutations through one `creditService`, always writing a `credit_transactions` row, in a DB transaction.
- Webhooks: verify signatures, dedupe by event id, return 2xx fast.
- Errors: typed error responses, no stack traces leaked to client.
- Maintain a `.env.example` documenting every required variable.
- **Conventional Commits**, small focused commits with clear messages.
- Keep `TASKS.md` synced with task status on every task completion.

---

## 12. Decisions Log

> Resolved domain/infra decisions. Update as more are made.

- **Whisper:** ✅ **Hosted OpenAI transcription API** (no GPU infra). `services/whisper` POSTs audio to OpenAI.
- **Background asset library:** ✅ **Fully dynamic — the catalog IS the `backgrounds` bucket.** No fixed key list anymore (the old `BACKGROUND_STYLE_KEYS` / `planAllowsStyle` and the static web `BACKGROUND_STYLES` array were removed). Owner uploads loops (any name, any case/spaces; `.mp4/.mov/.webm/.m4v`) to the public **`backgrounds` bucket** at the root. The **full object name is the style id** stored in `videos.background_style` (e.g. `"Temple Run.mp4"`); the worker downloads it verbatim (`backgroundObjectPath` is now a pass-through). Display **label = filename minus extension** (`backgroundLabel` in `apps/web/lib/backgrounds.ts`; library titles via `humanizeStyle` in `lib/format.ts`). Listing: web lists via the authenticated client in `getBackgrounds` (`lib/data.ts`) → passed to `CreateForm`; API lists via service role in `listBackgrounds` (`apps/api/.../storage.ts`). **Both sort by name with `localeCompare`** so gating agrees. **Plan gating is positional**: `planAllowsStyleAt(plan, index)` — free unlocks the first `FREE_STYLE_COUNT`=5 in sorted order, paid plans all. Requires a **`backgrounds_select_all` SELECT policy** on `storage.objects` (added to `0004_storage.sql`, applied via `provision.mjs`) so the non-service client can `.list()`. Preview/render read the **same** object, so an upload appears immediately — no naming step. Obsolete helper scripts kept for reference: `scripts/ls-storage.mjs` (inspect buckets via Storage REST — no supabase-js, avoids the Node-20 realtime WS error), `normalize-backgrounds.mjs` / `sync-backgrounds.mjs` (no longer needed — names are free-form now).
- **AI voiceover script source:** ✅ **Reuse the Whisper transcript** — narrate the original video's transcribed speech in a new AI voice. No new script field; voiceover depends on transcription. (Implication: voiceover requires a transcription pass even when captions are off.)
- **Lazy-expiry vs webhook renewal:** ✅ **Webhook is primary; lazy expiry is the fallback.** On a credit-consuming request, if `credits_expires_at` is past: check subscription status — `active` → refill plan default + recompute expiry; `cancelled`/`past_due` beyond grace → set `plan=free`, balance 1, `credits_expires_at=null`. Free credits never expire. Guard against double-granting with renewal webhook (dedupe by event id + idempotent credit grants).
- **App typeface:** ✅ **Syne (display) + DM Sans (UI) + JetBrains Mono (mono), applied app-wide** — matching the authoritative Google Stitch "Volt Dark High-Performance" design (Syne substitutes for the earlier Clash Display direction, DM Sans for Satoshi). Wired via CSS-variable tokens in `globals.css` (`--font-display`/`--font-syne` → Syne; `--font-ui`/`--font-dm` → DM Sans), so legacy `font-display`/`font-ui` classes and Stitch `font-syne`/`font-dm` classes resolve to the same families. Supersedes the original Clash Display + Satoshi spec.

- **Output storage for the render pipeline:** ✅ **All three buckets on Supabase Storage** for now (`backgrounds` public, `raw-uploads` private, `outputs` public) — one storage system to operate/debug. The spec's **AWS S3 for finished videos is deferred** (prod target); swap `OUTPUT_BUCKET`/`uploadFrom` to S3 when productionizing.
- **Free-plan watermark:** ✅ **Overlay the brand PNG** (`apps/api/assets/watermark.png`), not FFmpeg `drawtext`. drawtext needs an ffmpeg built with libfreetype, which the local Homebrew build lacks; `overlay` is universally available and also yields the real brand mark. Production ffmpeg (Railway Docker) can use either.
- **Supabase DB connection:** ✅ The direct host `db.<ref>.supabase.co` is **IPv6-only and unreachable** from many networks; use the **Session-mode pooler** `aws-1-ap-northeast-2.pooler.supabase.com:5432`, user `postgres.<ref>` (project region: ap-northeast-2). `.env` `SUPABASE_DB_URL` updated to this. Apply SQL migrations with `node --env-file=.env scripts/provision.mjs` (tries direct, then pooler regions). Buckets are created idempotently inside `0004_storage.sql`.
- **Local dev infra:** Redis via Homebrew (`brew services start redis`, `redis://127.0.0.1:6379`); ffmpeg via Homebrew. Run the API + worker in two terminals: `pnpm --filter @rotpitch/api dev` and `pnpm --filter @rotpitch/api dev:worker`.
- **Custom (user-uploaded) backgrounds:** ✅ **Paid-only** ("Pick a background" picker shows an "Upload your own" tile first; free plan sees it locked → upgrade modal). A custom background is **not** a catalog object — it's the user's own loop uploaded to the **`raw-uploads`** bucket at `{userId}/bg/{uuid}.ext`, carried in `videos.background_style` as **`custom:<rawObjectPath>`**. Shared helpers in `packages/shared/src/plans.ts`: `CUSTOM_BACKGROUND_PREFIX`, `isCustomBackground`, `customBackgroundPath`, `planAllowsCustomBackground` (= plans with `backgroundStyles: 'all'`). Web: `CreateForm` holds the file with a blob preview and uploads it only at generate time (`uploadCustomBackground` in `lib/api.ts`), then swaps the `__custom__` UI sentinel for the real `custom:<path>` id. API (`routes/videos.ts` `assertBackgroundAllowed`): custom ids skip catalog/positional gating but require a paid plan + ownership (`path.startsWith(\`${userId}/\`)`). Worker resolves the download source via `resolveBackgroundSource` (`services/storage.ts`) → raw-uploads bucket for custom, backgrounds bucket otherwise. Library label via `humanizeStyle` → "Custom background". **Known gap:** deleting a video doesn't remove its custom-bg object from raw-uploads (orphan), since cleanup would need a count-by-background guard for shared batch use.

- **Upload validation:** ✅ **Three layers, 60 s / 50 MB.** Short-form tool → input capped at **`MAX_INPUT_DURATION_SEC`=60 s**, **`MAX_UPLOAD_BYTES`=50 MB** (matches the `raw-uploads` bucket cap), MIME allowlist `mp4/mov/webm/m4v` — all in `packages/shared/src/plans.ts` (`validateUploadMeta`/`validateDuration`). (A) **Client** = instant UX only (`CreateForm.onFiles`: type+size then duration via an off-DOM `<video>`); never trusted. (B) **Bucket** = `allowed_mime_types` + `file_size_limit` on `raw-uploads` (enforced regardless of client). (C) **Worker** = the authoritative pass: `probeDurationSec` (ffprobe) after download rejects undecodable/over-cap files with a `RenderError` (`apps/api/src/lib/errors.ts`); the failed-job handler writes a user-facing `videos.failure_reason` (migration `0005`) shown on the library `VideoCard`. Custom-background uploads skip the duration cap (they loop). **Per-job progress %** intentionally **deferred** (renders ~8 s → cosmetic).

- **Captions burn-in via libass `subtitles` filter** (not PNG overlay): ✅ owner chose to **upgrade ffmpeg** over the watermark-style PNG-overlay approach. Whisper segments → a styled ASS file (`apps/api/src/services/captions.ts`, bold white + black outline, bottom-centre, libass auto-wrap) → burned with `subtitles=` in the composite filtergraph. **Local ffmpeg infra:** homebrew-core `ffmpeg` is built **without** libass/freetype/fontconfig (so no `subtitles`/`drawtext`/`ass`) — replaced it with **`homebrew-ffmpeg/ffmpeg/ffmpeg` 8.1.1** (libass+freetype+fontconfig+harfbuzz required deps). Railway prod ffmpeg (apt) already ships libass. ffmpeg/ffprobe paths are now env-overridable (`FFMPEG_BIN`/`FFPROBE_BIN`). Transcription = native `fetch` to OpenAI `audio/transcriptions` (`verbose_json`, segment timestamps) — **no openai SDK dep**. `OPENAI_API_KEY` optional: a caption job without it fails with a user-facing reason + refund; plain renders unaffected. No-audio / no-speech demos render **without** captions (not a failure). **Phase 9 follow-up:** bundle a brand font + pass the `subtitles` filter's `fontsdir` so prod captions don't depend on system fonts (libass currently falls back to Arial/system sans).

- **Production runtime for `apps/api` = `tsx` on TypeScript source** (not compiled `dist`): ✅ The `tsc` build is **non-runnable** in prod — emitted JS keeps `import … from '@rotpitch/shared'`, but the shared package's `main` is raw `src/index.ts`, so `node dist/index.js` throws `ERR_UNKNOWN_FILE_EXTENSION` (.ts); and `services/ffmpeg.ts` resolves `assets/watermark.png` via `import.meta.url` (`../../assets/...`), which **bundling** (esbuild/tsup to a single file) would also break. Running `tsx src/index.ts` keeps both the workspace import and `import.meta.url` asset paths resolving exactly as in dev. Prod scripts `start`/`start:worker` drop `--env-file` (Railway/Vercel inject env); `tsx` moved to `dependencies`. `index.ts` now binds `process.env.PORT || API_PORT`. The `build` (`tsc`) script is retained for typecheck/CI only. Verified booting via the prod `start` script.
- **Deploy config (Phase 9) — ✅ LIVE in prod (2026-06-09), verified end-to-end:** **Railway = one Dockerfile (`apps/api/Dockerfile`), two services** — `api` (default CMD `start`, `/health` check, `$PORT`; `rotpitchapi-production.up.railway.app`) and `worker` (CMD override `pnpm --filter @rotpitch/api start:worker`, no HTTP). Image = `node:20-bookworm-slim` + apt `ffmpeg` (ships libass/freetype/fontconfig) + `fonts-liberation` (caption fallback font — resolves the Phase 6 `fontsdir` gap for now) + pnpm workspace install; **build context is the repo root** (Railway service Root Directory left blank, Dockerfile Path `/apps/api/Dockerfile`, no Custom Build Command). **Vercel = `apps/web`** root dir, Next.js preset (`transpilePackages` handles `@rotpitch/shared`); `rotpitch-web.vercel.app`. **Redis = Upstash** (`rediss://` connect URL, not REST). Outputs stay on **Supabase** (S3 still deferred). Root `.dockerignore` keeps `.env*` out of the image. Full runbook in **`DEPLOY.md`**. **Two prod-only issues hit & fixed during rollout:** (1) Railway's dependency scanner blocks HIGH CVEs across the whole workspace lockfile → bumped `next` 14.2.13→14.2.35; (2) in-container ffmpeg OOM-killed at encode start (x264 over-threaded against the host core count, pre-allocating multi-GB of 1080×1920 lookahead buffers) → capped via `FFMPEG_THREADS` env (default 2) on `-threads`/`-filter_complex_threads`.

### Toolchain adjustments (flagged, pending owner confirmation)
- **Express 4** (not 5) — middleware compatibility for a payments service.
- **FFmpeg via Dockerfile** on Railway (`apt-get install ffmpeg`), not `ffmpeg-static`.
- **Fonts** load from **Google Fonts** (`Syne` + `DM Sans` + `JetBrains Mono`) via CSS `@import` in `globals.css` today; `next/font` self-hosting is the production target once woff2 files are vendored.
- Web→API auth = Supabase JWT in `Authorization` header; CORS locked to Vercel origin.
- BullMQ Redis connection uses Upstash **Redis** endpoint (not REST), `maxRetriesPerRequest: null`.
