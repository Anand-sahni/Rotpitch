# RotPitch

Turn a product demo video into a viral split-screen social clip with zero editing.
**Upload → Generate → Download → Post.**

Monorepo: Turborepo + pnpm + TypeScript (strict). See `CLAUDE.md` for the full spec, schema, design tokens, and conventions.

## Layout

```
apps/
  web/        Next.js 14 (App Router) + Tailwind  → Vercel
  api/        Express video API + BullMQ workers   → Railway
packages/
  db/         Supabase SQL migrations + type-gen
  shared/     PLANS, zod schemas, shared types (imported by both apps)
```

## Prerequisites

- Node ≥ 20, `pnpm` 9
- A Supabase project (Postgres + Auth + Storage)
- Later phases: Redis (Upstash), AWS S3, OpenAI, ElevenLabs, Stripe, Razorpay, FFmpeg

## Setup

```bash
pnpm install

# Environment — copy the root template and fill in values.
cp .env.example .env
# The web app reads NEXT_PUBLIC_* at build/run time. For local dev, mirror the
# public vars into apps/web/.env.local and the server vars into apps/api/.env:
#   apps/web/.env.local : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL
#   apps/api/.env       : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEB_ORIGIN, API_PORT
```

### Database

Apply the migrations in `packages/db/migrations/` to your Supabase project (SQL
editor, in order), then generate types:

```bash
SUPABASE_PROJECT_ID=your-ref pnpm db:gen-types
```

### Supabase Auth

Enable Email and Google providers in the Supabase dashboard. Set the redirect
URL to `http://localhost:3000/auth/callback` (and your prod web origin).

## Run

```bash
pnpm dev            # turbo: web (:3000) + api (:4000)
pnpm typecheck      # strict type-check across the workspace
pnpm lint
pnpm format
```

- Web: http://localhost:3000 — landing, `/login`, `/signup`, `/app` (protected), `/theme-check`
- API: http://localhost:4000/health

## Status

Phase 1 complete (foundation, DB, shared, design system, auth). See `TASKS.md`.

> **Design system note:** tokens are seeded from the PRD/Design-System spec
> (`RotPitch_Spec_and_Design_System.html`). The requested Stitch import was not
> possible — no Stitch MCP is connected and the project URL needs Google auth.
> Provide Figma OAuth or the Stitch export to reconcile.
