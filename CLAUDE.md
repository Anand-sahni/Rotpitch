# RotPitch — Project Memory (CLAUDE.md)

> Persistent project context for Claude Code. Keep this updated as the build progresses.
> Source of truth: `RotPitch_Spec_and_Design_System.html` (PRD v2.0 · Design System v1.0) + the build brief.
> Status: **IN BUILD** — Phases 1 (foundation, DB, shared, design system, full auth, all app screens), 4 + 5 (render pipeline) are done; render verified end-to-end (upload → FFmpeg composite → Supabase output → done, 1 credit deducted/refunded). Background loops live in the Supabase `backgrounds` bucket named `{style_key}.mp4` (picker preview + worker read the same file). Upload validation now enforced in 3 layers (client type/size/≤60s · `raw-uploads` bucket MIME+50 MB cap · worker `ffprobe` re-check → `videos.failure_reason` shown on failed cards). Owner gameplay asset pack uploaded. **Auto-captions are live** (Phase 6, part 1): worker transcribes the demo audio via OpenAI Whisper and burns styled captions in with libass (`subtitles` filter); verified end-to-end through the real render path (live Whisper HTTP call pending an `OPENAI_API_KEY` in `.env`). **Phase 9 (deploy) was DONE on Railway/Upstash** (2026-06-09) and was then **migrated to AWS** (**LIVE & verified end-to-end 2026-06-14**): web stays on **Vercel**, but API + worker move from Railway → **AWS EC2 (docker-compose: api + worker + redis container)**, the BullMQ queue from Upstash → the **Redis container on the box**, and finished-video output from the Supabase `outputs` bucket → a **private AWS S3 bucket served via presigned GET URLs** (`videos.output_url` now stores the S3 object key; the worker uploads to S3, the web data layer + API GET presign on read; legacy Supabase full-URL rows pass through unchanged). DB/Auth + the `raw-uploads`/`backgrounds` buckets stay on **Supabase**. See `DEPLOY.md` for the AWS runbook. Remaining/deferred: per-job progress % (cosmetic at ~8 s renders); not started: Phase 6 voiceover (ElevenLabs). **Phase 7 billing is CODE-COMPLETE on Dodo Payments** (single Merchant of Record covering both global USD + India INR — replaces the old Stripe + Razorpay dual-gateway plan): hosted checkout + customer portal + signed webhooks (`apps/api/src/services/dodo.ts`, `billingService.ts`, `routes/billing.ts`, `routes/webhooks.ts`; migrations `0006`/`0007`; web `/app/billing` CTAs live). **Pending owner Dodo dashboard setup** (account, 3 products, API/webhook keys, `provision.mjs` on the live DB) + live verify — see `DEPLOY.md` → Dodo Payments setup. **Phase 11 (2026-08-30) — RELAUNCHED and LIVE on a new topology.** The AWS deployment had been torn down and the Supabase project paused (a paused project drops its DNS record — it was never deleted; all data survived). Hetzner + Cloudflare R2 was built and then **rejected by the owner** (unwilling to open accounts/cards with unfamiliar providers); the S3-compatible `S3_ENDPOINT` layer written for R2 made the pivot free. Now: web on **Vercel** (`rotpitch.com`), api + worker + Redis on **Railway** (`api.rotpitch.com`), and **all** storage on **Supabase** — finished renders moved from AWS S3 to the **Supabase S3-compatible endpoint** (`outputs` bucket, now **private** + presigned; it had been public since Phase 9). Verified end-to-end in prod: signup → upload → render (~12 s) → presigned 1080×1920 H.264+AAC download with watermark. **Security note: never S3-authenticate with a Supabase session token — `getSignedUrl` embeds the service-role key in the URL as `X-Amz-Security-Token`.** **Landing page now runs on real media (2026-08-31)** — every placeholder (CSS-pattern background wall, before/after wipe mock, fake caption animation, empty variant cards) replaced with actual pipeline output served from a new public Supabase `marketing` bucket; product copy repositioned from "product demo" to "any video". See the Decisions Log. **Analytics wired 2026-08-31 (code-complete, keys pending):** two tools by design — Vercel Web Analytics for top-of-funnel traffic (no keys; enable in the Vercel dashboard; `/app/*` pageviews dropped client-side so it never becomes a half-built funnel tool) and PostHog for the product funnel. PostHog spans both processes: `apps/web/lib/analytics.ts` (closed `AnalyticsEvent` union) plus the **worker** (`apps/api/src/services/analytics.ts` → `render_started`/`_succeeded`/`_failed`), because the browser can't see whether a queued render finished. Both sides key on the Supabase `users.id` UUID — that shared distinct id is the only thing stitching them into one person. **`posthog-js` must stay a dynamic `import()`**: a static one puts 267 kB in the root-layout chunk that every marketing visitor downloads (measured: `/` went 725 kB → 458 kB of raw JS when it was made lazy). Everything is inert until `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_API_KEY` are set. See `TASKS.md` for granular status.

---

## 1. Product

RotPitch is a **web SaaS that turns any video into a viral split-screen social clip with zero editing**. The user uploads footage, picks a high-retention background (gameplay / ASMR / abstract loops), optionally adds auto-captions and AI voiceover, and exports a ready-to-post 9:16 or 16:9 video.

> **Repositioned 2026-08-31** from "turns a *product demo* video into…". The owner's call: the pipeline is source-agnostic and the best-performing real outputs are podcast clips, so pinning the copy to product demos was under-selling it. The landing page and `app/layout.tsx` metadata were swept accordingly (see the Decisions Log). Target users below still skew founder/product, but the product claim no longer does.

**Core loop:** Upload → Generate → Download → Post.

Positioning: not a video editor — a *growth tool that happens to output video*. Competes on speed and zero skill, not creative control.

Target users: indie hackers / solo founders, mobile app devs, e-commerce / DTC brands, digital product creators.

---

## 2. Tech Stack (authoritative — flag before deviating)

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm + TypeScript (**strict**) |
| Frontend | Next.js 14 (App Router) + React + Tailwind CSS → deploy **Vercel** |
| Backend | Node.js + Express (video API + workers) → deploy **Railway** (services: api + worker + Redis) |
| DB / Auth / raw storage | Supabase (Postgres, RLS, Supabase Auth email + Google OAuth, Supabase Storage for raw uploads + backgrounds) |
| Output storage | **Supabase Storage via its S3-compatible endpoint** (private `outputs` bucket, presigned GET) — **live** |
| Queue | BullMQ + Redis — **Railway Redis service** (persistent volume) — async render, retries, **priority lane for Pro** |
| Video processing | FFmpeg (composite product + background, burn captions, mux voiceover, watermark) |
| Captions | OpenAI Whisper |
| Voiceover | ElevenLabs |
| Payments | **Dodo Payments** — single Merchant of Record (handles global USD + India INR, tax/VAT/GST; hosted checkout + customer portal) |
| Analytics | **Vercel Web Analytics** (marketing traffic, `/app/*` filtered out) + **PostHog** (product funnel, client *and* worker events). Both optional/inert without keys — see `DEPLOY.md` §9 |

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
    services/          ffmpeg, whisper, elevenlabs, s3, dodo (payments) wrappers
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
| Max video length | 10s | 15s | 30s | 60s |
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
- **Mid-cycle top-ups:** one-time credit packs (`CREDIT_PACKS` in `packages/shared/src/plans.ts` — 10/$6.99, 25/$14.99, 60/$32.99) for a subscriber who runs out before renewal. Priced **above** the flat $0.50/credit plan rate so a pack never beats subscribing. **Paid plans only.** Granted additively by `add_credits` (migration `0008`) on the `payment.succeeded` webhook — *not* `apply_plan_grant`, which replaces the balance. Top-up credits ride the current billing window and are wiped by the next renewal like any other balance (no rollover).
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
- **Webhooks:** verify the Standard-Webhooks signature on every event; dedupe by `webhook-id` (idempotent); return 2xx fast.

Gateway: **Dodo Payments** — one Merchant-of-Record integration covering global USD + India INR (Dodo handles tax/VAT/GST, invoicing, and is seller of record; no per-region entity/KYC on our side). Hosted Checkout Sessions for purchase; hosted Customer Portal for self-serve upgrade/downgrade/cancel/payment-method/invoices.

---

## 8. Database Schema (Supabase / Postgres — RLS on all user-scoped tables)

**users**: `id uuid PK (= auth uid)`, `email text unique`, `plan enum(free|basic|popular|pro)`, `credits_balance int`, `credits_expires_at timestamptz null`, `billing_cycle_start timestamptz null`, `dodo_customer_id text null` (Dodo `cus_…`, set on first checkout), `created_at`.

**videos**: `id uuid PK`, `user_id FK`, `status enum(pending|processing|done|failed)`, `input_url text`, `output_url text null`, `background_style text`, `format enum(vertical|horizontal)`, `has_captions bool`, `has_voiceover bool`, `has_watermark bool`, `batch_id uuid null`, `created_at`.

**credit_transactions**: `id uuid PK`, `user_id FK`, `amount int (+add / −deduct)`, `type enum(signup|purchase|use|refund)`, `video_id FK null`, `payment_id text null`, `created_at`.

**subscriptions**: `id uuid PK`, `user_id FK`, `plan enum(basic|popular|pro)`, `payment_gateway enum(dodo)`, `gateway_subscription_id text` (Dodo `sub_…`), `status enum(active|cancelled|past_due)`, `current_period_start`, `current_period_end`.

---

## 9. Core API Routes (Express)

- `POST /api/videos/generate`
- `POST /api/videos/auto-generate`
- `GET  /api/videos`
- `GET  /api/videos/:id`
- `POST /api/billing/checkout` (create a Dodo Checkout Session for a plan → returns `checkout_url`)
- `POST /api/billing/topup` (one-time credit pack → `checkout_url`; paid plans only)
- `POST /api/billing/portal` (create a Dodo Customer Portal link for self-serve manage/cancel)
- `POST /api/webhooks/dodo` (Standard-Webhooks signed; raw body; idempotent by `webhook-id`)
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

- **Output storage for the render pipeline:** ✅ **Finished videos now live in AWS S3** (private bucket, presigned GET) — superseding the earlier "all three buckets on Supabase" interim. `backgrounds` (public) + `raw-uploads` (private) **stay on Supabase Storage**; only OUTPUT moved. Implementation: `videos.output_url` stores the **S3 object key** (`{userId}/{videoId}.mp4` via `outputObjectKey` in `packages/shared/src/storage.ts`), not a URL. Worker uploads via `uploadOutput` (`apps/api/src/services/s3.ts`); reads are presigned on demand — the web data layer (`apps/web/lib/s3.ts` `presignOutput`, called in `getVideos`, re-signed each server render) and the API `GET /api/videos/:id` (`presignOutput` in the api s3 service). The Supabase `uploadFrom`/`getPublicUrl` path and `OUTPUT_BUCKET` env were removed; delete now hits `deleteOutput` (S3). **Legacy rows** (pre-cutover, full Supabase URL) are detected by `isAbsoluteUrl` and passed through unchanged. AWS creds via the SDK default chain: **EC2 instance role** for api/worker (no keys in `.env`), explicit **read-only `s3:GetObject` IAM user** for the web on Vercel. Env: `AWS_REGION`, `S3_OUTPUT_BUCKET`, `S3_PRESIGN_EXPIRES_SEC` (default 3600). Bucket needs a CORS rule allowing the Vercel origin to GET (browser fetches the presigned URL directly).
- **Free-plan watermark:** ✅ **Overlay the brand PNG** (`apps/api/assets/watermark.png`), not FFmpeg `drawtext`. drawtext needs an ffmpeg built with libfreetype, which the local Homebrew build lacks; `overlay` is universally available and also yields the real brand mark. Production ffmpeg (Railway Docker) can use either.
- **Supabase DB connection:** ✅ The direct host `db.<ref>.supabase.co` is **IPv6-only and unreachable** from many networks; use the **Session-mode pooler** `aws-1-ap-northeast-2.pooler.supabase.com:5432`, user `postgres.<ref>` (project region: ap-northeast-2). `.env` `SUPABASE_DB_URL` updated to this. Apply SQL migrations with `node --env-file=.env scripts/provision.mjs` (tries direct, then pooler regions). Buckets are created idempotently inside `0004_storage.sql`.
- **Local dev infra:** Redis via Homebrew (`brew services start redis`, `redis://127.0.0.1:6379`); ffmpeg via Homebrew. Run the API + worker in two terminals: `pnpm --filter @rotpitch/api dev` and `pnpm --filter @rotpitch/api dev:worker`.
- **Custom (user-uploaded) backgrounds:** ✅ **Paid-only** ("Pick a background" picker shows an "Upload your own" tile first; free plan sees it locked → upgrade modal). A custom background is **not** a catalog object — it's the user's own loop uploaded to the **`raw-uploads`** bucket at `{userId}/bg/{uuid}.ext`, carried in `videos.background_style` as **`custom:<rawObjectPath>`**. Shared helpers in `packages/shared/src/plans.ts`: `CUSTOM_BACKGROUND_PREFIX`, `isCustomBackground`, `customBackgroundPath`, `planAllowsCustomBackground` (= plans with `backgroundStyles: 'all'`). Web: `CreateForm` holds the file with a blob preview and uploads it only at generate time (`uploadCustomBackground` in `lib/api.ts`), then swaps the `__custom__` UI sentinel for the real `custom:<path>` id. API (`routes/videos.ts` `assertBackgroundAllowed`): custom ids skip catalog/positional gating but require a paid plan + ownership (`path.startsWith(\`${userId}/\`)`). Worker resolves the download source via `resolveBackgroundSource` (`services/storage.ts`) → raw-uploads bucket for custom, backgrounds bucket otherwise. Library label via `humanizeStyle` → "Custom background". ~~**Known gap:** deleting a video doesn't remove its custom-bg object from raw-uploads (orphan)~~ — **FIXED 2026-08-30** by `purgeJobUploads` (see the raw-upload purge entry in the Decisions Log): the custom background is removed when the render reaches a terminal state, guarded by a count of `pending`/`processing` siblings, so a shared batch is safe. The DELETE route keeps a legacy sweep for rows created before the change.

- **Upload validation:** ✅ **Three layers, 60 s / 50 MB.** Short-form tool → input capped at **`MAX_INPUT_DURATION_SEC`=60 s**, **`MAX_UPLOAD_BYTES`=50 MB** (matches the `raw-uploads` bucket cap), MIME allowlist `mp4/mov/webm/m4v` — all in `packages/shared/src/plans.ts` (`validateUploadMeta`/`validateDuration`). (A) **Client** = instant UX only (`CreateForm.onFiles`: type+size then duration via an off-DOM `<video>`); never trusted. (B) **Bucket** = `allowed_mime_types` + `file_size_limit` on `raw-uploads` (enforced regardless of client). (C) **Worker** = the authoritative pass: `probeDurationSec` (ffprobe) after download rejects undecodable/over-cap files with a `RenderError` (`apps/api/src/lib/errors.ts`); the failed-job handler writes a user-facing `videos.failure_reason` (migration `0005`) shown on the library `VideoCard`. Custom-background uploads skip the duration cap (they loop). **Per-job progress %** intentionally **deferred** (renders ~8 s → cosmetic).

- **Per-plan video length (2026-07-09):** ✅ The 60 s cap is now a **per-plan maximum** (paid upsell), plus a global **`MIN_INPUT_DURATION_SEC`=5 s** floor. Maxes: **free 10 s · basic 15 s · popular 30 s · pro 60 s** — `PlanFeatures.maxDurationSec` in `packages/shared/src/plans.ts`; `MAX_INPUT_DURATION_SEC`=60 kept as the absolute ceiling (= Pro) for plan-agnostic display + fallback. `validateDuration(seconds, plan?)` gained the `plan` arg (comparisons `Math.round` to the nearest second so a 10.03 s clip passes at a 10 s cap); non-Pro over-cap errors say "trim it or upgrade for longer clips". Enforced in the same layers as the rest of upload validation: **(A) client** `CreateForm` passes the user's `plan` (dropzone hint now shows the `5–{max}s` range); **(C) worker** is authoritative — `plan` rides on the `RenderJob` (`lib/queue.ts`, optional for legacy-job decode → falls back to the absolute ceiling), set at enqueue in `routes/videos.ts`, and `renderWorker` calls `validateDuration(durationSec, plan)`. Note the **bucket layer (B) can't gate duration** (only MIME/size), so the worker remains the real gate. Length is **not** DB-persisted; it's derived from the probed input. Verified via a boundary unit-test of `validateDuration` across all plans.

- **Captions burn-in via libass `subtitles` filter** (not PNG overlay): ✅ owner chose to **upgrade ffmpeg** over the watermark-style PNG-overlay approach. Whisper segments → a styled ASS file (`apps/api/src/services/captions.ts`, bold white + black outline, bottom-centre, libass auto-wrap) → burned with `subtitles=` in the composite filtergraph. **Local ffmpeg infra:** homebrew-core `ffmpeg` is built **without** libass/freetype/fontconfig (so no `subtitles`/`drawtext`/`ass`) — replaced it with **`homebrew-ffmpeg/ffmpeg/ffmpeg` 8.1.1** (libass+freetype+fontconfig+harfbuzz required deps). Railway prod ffmpeg (apt) already ships libass. ffmpeg/ffprobe paths are now env-overridable (`FFMPEG_BIN`/`FFPROBE_BIN`). Transcription = native `fetch` to OpenAI `audio/transcriptions` (`verbose_json`, segment timestamps) — **no openai SDK dep**. `OPENAI_API_KEY` optional: a caption job without it fails with a user-facing reason + refund; plain renders unaffected. No-audio / no-speech demos render **without** captions (not a failure). **Phase 9 follow-up:** bundle a brand font + pass the `subtitles` filter's `fontsdir` so prod captions don't depend on system fonts (libass currently falls back to Arial/system sans).

- **Production runtime for `apps/api` = `tsx` on TypeScript source** (not compiled `dist`): ✅ The `tsc` build is **non-runnable** in prod — emitted JS keeps `import … from '@rotpitch/shared'`, but the shared package's `main` is raw `src/index.ts`, so `node dist/index.js` throws `ERR_UNKNOWN_FILE_EXTENSION` (.ts); and `services/ffmpeg.ts` resolves `assets/watermark.png` via `import.meta.url` (`../../assets/...`), which **bundling** (esbuild/tsup to a single file) would also break. Running `tsx src/index.ts` keeps both the workspace import and `import.meta.url` asset paths resolving exactly as in dev. Prod scripts `start`/`start:worker` drop `--env-file` (Railway/Vercel inject env); `tsx` moved to `dependencies`. `index.ts` now binds `process.env.PORT || API_PORT`. The `build` (`tsc`) script is retained for typecheck/CI only. Verified booting via the prod `start` script.
- **Deploy config (Phase 9) — was LIVE on Railway/Upstash (2026-06-09); now migrating to AWS (2026-06-09, code-complete):** **NEW topology — AWS EC2 + docker-compose:** the **same one Dockerfile (`apps/api/Dockerfile`)** now powers **three compose services** (`docker-compose.yml` at repo root): `redis` (`redis:7-alpine`, appendonly, named volume — replaces Upstash), `api` (default CMD `start`, port 4000, `/health`), `worker` (CMD override `pnpm --filter @rotpitch/api start:worker`, no HTTP). Only `api` declares the `build`; `worker` reuses the built `rotpitch-api:latest` image. compose overrides `REDIS_URL=redis://redis:6379` and sets `PORT=4000`; runtime env from `.env` (kept out of the image by `.dockerignore`). Recommended EC2 = **Ubuntu 24.04**, ≥ t3.large, with an **IAM instance role** (S3 Put/Get/Delete on the outputs bucket) so no AWS keys in `.env`. **Vercel = `apps/web`** unchanged, plus the web now needs **read-only AWS keys** (`s3:GetObject`) + `AWS_REGION`/`S3_OUTPUT_BUCKET` to presign output URLs server-side; `next.config.mjs` adds `serverComponentsExternalPackages: ['@aws-sdk/client-s3','@aws-sdk/s3-request-presigner']`. Full AWS runbook rewritten in **`DEPLOY.md`**. **Carried over from the Railway rollout (still relevant):** image base `node:20-bookworm-slim` + apt `ffmpeg` (libass/freetype/fontconfig) + `fonts-liberation`; build context = repo root; `next` pinned ≥ 14.2.35 (CVE fix); in-container ffmpeg OOM fixed via `FFMPEG_THREADS` (default 2) on `-threads`/`-filter_complex_threads`.

- **Raw uploads purged once a render is terminal (2026-08-30):** ✅ `purgeJobUploads(userId, inputPath, backgroundStyle)` in `services/storage.ts`, called from `renderWorker` after `setVideoDone` and in the `worker.on('failed')` handler. A render's inputs were kept **forever**: the raw demo averages **3.2 MB** and nothing reads it once the job finishes (the output lives in the `outputs` bucket), so on Supabase Free's 1 GB it was the difference between **~106 and ~175 stored videos**. Also closes the long-standing **custom-background orphan gap** — the `custom:<path>` loop is now removed at completion rather than never. **Batch safety is the whole trick:** an Auto Generate batch shares ONE raw upload across N videos, so the purge fires only when `countActiveVideosByInput`/`countActiveVideosByBackground` (status `pending`/`processing`) returns 0, and runs *after* the terminal status is written so the finishing job doesn't count itself. Safe because the queue is configured **without retries** (no `attempts`), so a terminal job never needs its inputs again. Best-effort: `purgeJobUploads` never throws, so cleanup can't fail a good render. Verified in prod: single render → raw gone; **batch of 3 → 3 done, 0 failed**, raw removed only at the end; custom-bg render → both raw and bg gone.

- **Background loops cached on the worker's disk (2026-08-30):** ✅ `services/backgroundCache.ts` — `materializeBackground(style, fallbackPath)` replaces the unconditional `downloadTo` for backgrounds in `renderWorker`. The worker was re-downloading the same handful of catalog loops on **every** render; measured on the live catalog they average **14.7 MB** (largest 41 MB), making the background ~**65% of all Supabase egress per render** (~22.8 MB, of which only ~8 MB is genuinely per-job: the user's upload + their finished download). Caching cuts per-render egress to ~8 MB, which roughly **triples** renders-per-egress-budget (~225 → ~630/month on Supabase Free's 5 GB). Design: only **catalog** backgrounds are cached (a `custom:<path>` loop is one user's own file used once); freshness via a **metadata-only** lookup with the cache key embedding `size + updated_at`, so replacing a loop under the same filename invalidates rather than serving stale bytes; **LRU eviction** at `BACKGROUND_CACHE_MAX_MB` (default 512, `0` disables); cache lives **outside** the per-job temp dir the worker `rm -rf`s in its `finally`, and `renderComposite` is handed the resolved path — never delete what `materializeBackground` returns. Optional `BACKGROUND_CACHE_DIR` points it at a mounted volume; without one it is simply cold after each deploy and re-warms. Verified locally: miss 7525 ms → hit **209 ms** (0 bytes transferred), custom backgrounds bypass, cache entry count unchanged.

- **Output frame rate pinned to 30 fps (2026-08-30):** ✅ `buildFFmpegArgs` now passes `-r 30` (`OUTPUT_FPS` in `services/ffmpeg.ts`). Without an explicit `-r`, the stacked output inherited the **fastest input**, so render cost depended on which background the user picked: a 25 fps demo against the 60 fps `GTA V driving in Los Santos.mp4` loop produced ~80 effective fps and **838 frames** for a 10.5 s clip, vs 524 against a 30 fps loop. In production that pushed a normal 1080×1920 / 10.5 s render past `RENDER_TIMEOUT_MS` (180 s) — it failed, refunded the credit, and told the user to "try a shorter clip", which was misleading: the clip was fine, the background was 60 fps. Reels/Shorts/TikTok are 30 fps, so pinning is also the correct output. Measured on the same inputs: **838 → 314 frames, 9.3 s → 5.2 s local**; in prod the same job went from timing out at 180 s to **done in 30 s**. Also raised `FFMPEG_THREADS` 2 → 4 and `RENDER_TIMEOUT_MS` 180 s → 300 s on Railway for headroom (memory stays bounded by `RENDER_CONCURRENCY=1` + `rc-lookahead`).

- **Payments gateway = Dodo Payments (single Merchant of Record) — supersedes Stripe + Razorpay (2026-06-15):** ✅ The original dual-gateway plan (Stripe for intl/USD, Razorpay for India/INR) is **dropped entirely**. Dodo Payments is a global MoR (190+ countries, 80+ currencies) that processes both USD and INR under one integration and is the legal seller of record (it remits tax/VAT/GST, issues invoices) — so there is no separate per-region business entity / PAN+bank KYC on our side. One gateway, one webhook endpoint, one set of secrets. Implementation shape: **Node SDK `dodopayments`** (`new DodoPayments({ bearerToken: DODO_PAYMENTS_API_KEY, environment: 'test_mode'|'live_mode' })`); **one Dodo subscription product per paid plan**, IDs mapped via env (`DODO_PRODUCT_BASIC`/`_POPULAR`/`_PRO`); purchase via **hosted Checkout Session** (`client.checkoutSessions.create` → redirect to `checkout_url`); self-serve manage/cancel/upgrade/payment-method/invoices via the **hosted Customer Portal** (`client.customers.customerPortal.create(cus_id)`) — no custom billing UI to build. **Webhooks** use the **Standard Webhooks** spec verified with the `standardwebhooks` lib (`DODO_PAYMENTS_WEBHOOK_KEY`, headers `webhook-id`/`webhook-signature`/`webhook-timestamp`, **raw body required**); dedupe by `webhook-id`. Lifecycle event strings: `subscription.active` (first payment → grant credits, start cycle), `subscription.renewed` (wipe+refill, no rollover), `subscription.plan_changed` (upgrade/downgrade applied), `subscription.on_hold` (→ our `past_due`, 3-day grace), `subscription.cancelled`, `subscription.expired` (→ drop to Free); plus `payment.succeeded`/`payment.failed`. **Webhooks are the source of truth** for granting credits/plan — the `return_url` is cosmetic UX only. DB: `users.dodo_customer_id`, `subscriptions.payment_gateway` enum collapsed to `('dodo')` (migration `0006`, table empty pre-launch so the enum is recreated). Docs: docs.dodopayments.com (checkout-session, webhooks/intents/subscription, customer-portal).

- **Landing-page media = real renders in a separate `marketing` bucket (2026-08-31):** ✅ Every placeholder on the marketing page was replaced with actual pipeline output. **Bucket choice is load-bearing: these must NOT live in `backgrounds`.** `getBackgrounds` lists that bucket and free-tier gating is *positional* (`planAllowsStyleAt`, first `FREE_STYLE_COUNT`=5 in `localeCompare` order), so any extra object dropped there silently reshuffles which styles are free. Hence a new **public `marketing` bucket** + `marketingAssetUrl()` in `apps/web/lib/marketing.ts`. **Caching:** objects are uploaded `public, max-age=31536000, immutable`, so filenames carry a version suffix and are **never overwritten** — publish `-v2`, don't replace `-v1`. Two Supabase gotchas: the dashboard uploader can't set Cache-Control (upload via the Storage REST API with a `Cache-Control` header — the multipart `cacheControl` form field mangles it), and a **HEAD returns `cache-control: no-cache` while a GET returns the real header**, so verify with GET or you will chase a phantom. Verified repeat-load: `transferSize: 0`, 7 ms, from disk cache.
  **Assets** (all silent, `-movflags +faststart`, ~2.4 MB total): 10 tile cuts + JPEG posters (480×270, 4 s) for the library wall; `demo-before-v2` / `demo-bg-v1` / `demo-after-v2` (540×960) for the SEC.04 equation — all exactly **312 frames @30 fps so the three panels loop in lockstep**; `captions-demo-v1` (360×640); `var-01..05-v1.jpg` (144×256) for the variant fan. Posters are JPEG, not WebP: the local homebrew-ffmpeg build has no `libwebp` encoder.
  **Components:** `RotLibraryWall` now renders the **real catalog names** (it previously invented `slime_asmr.mp4`, `tower_stack.mp4` etc. that exist in no bucket) with `free` badges matching the real positional split; tiles are `<video preload="none">` + poster, played only while intersecting (20 elements, 10 network fetches). `BeforeAfterSlider` was **deleted** — a 9:16 clip in a 16:9 wipe was mostly black bars — and replaced by `OutputEquation` (input + background = output, three portrait panels). `CaptionLoop` was a CSS mock of caption words on a card claiming Whisper+libass; it is now a real burned-in render. The variant fan uses five real Auto Generate outputs of one upload on five different loops, with per-card hover lift.
  **⚠️ Rights:** the demo/caption/variant footage is a third-party podcast (*On Purpose*, identifiable hosts) composited over Subway Surfers / Minecraft. The owner was shown the copyright + right-of-publicity + Content-ID exposure and **chose to publish as-is**; this is a known, accepted risk, not an oversight. Same caveat as the `backgrounds` catalog itself (Temple Run / Subway Surfers / Minecraft / GTA V — `Temple Run.mp4` even has a YouTube ad overlay baked in around t=4–8 s, so it was captured from someone's upload). Replacing this with owned or licensed footage is a pre-launch item.

- **Never run `next build` while `next dev` is running (2026-08-31):** ⚠️ Both write `apps/web/.next`. A production build mid-session overwrites the dev server's chunks; the dev server keeps answering `GET /` with 200 but **every `/_next/static/*` request 404s** — no CSS (page renders as unstyled serif), no JS (nothing hydrates, so `<Reveal>` never adds `.in` and the whole page below the hero stays at `opacity: 0`). Symptom is easy to misread as a code bug. Fix: stop dev, `rm -rf apps/web/.next`, restart. Bit us twice in one session.

### Toolchain adjustments (flagged, pending owner confirmation)
- **Express 4** (not 5) — middleware compatibility (incl. the Dodo payments/webhook routes).
- **FFmpeg via Dockerfile** on Railway (`apt-get install ffmpeg`), not `ffmpeg-static`.
- **Fonts** load from **Google Fonts** (`Syne` + `DM Sans` + `JetBrains Mono`) via CSS `@import` in `globals.css` today; `next/font` self-hosting is the production target once woff2 files are vendored.
- Web→API auth = Supabase JWT in `Authorization` header; CORS locked to Vercel origin.
- BullMQ Redis connection uses Upstash **Redis** endpoint (not REST), `maxRetriesPerRequest: null`.
