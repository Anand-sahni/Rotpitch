# RotPitch API + render worker.
# One image, two roles: the API service runs `start`, the worker service
# overrides the command with `start:worker` (see docker-compose.yml — a single
# EC2 box runs both from this one image).
#
# Production runtime = tsx on TypeScript source (mirrors local dev). This keeps
# the @rotpitch/shared workspace import and the import.meta.url asset paths
# (apps/api/assets/watermark.png) resolving exactly as they do in dev — a plain
# `tsc` build does NOT (it emits unresolved `@rotpitch/shared` imports).
#
# Build context MUST be the repo root (pnpm workspace):
#   docker build -f apps/api/Dockerfile -t rotpitch-api .

# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

# ffmpeg here ships WITH libass/freetype/fontconfig (caption burn-in via the
# `subtitles` filter). Liberation fonts give libass a sane sans fallback so
# captions render without depending on a host font set.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      fontconfig \
      fonts-liberation \
      ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# --- dependency layer (cached unless a manifest or the lockfile changes) ------
# Copy every workspace manifest the lockfile references so --frozen-lockfile
# can validate without the full source tree.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json        apps/api/package.json
COPY apps/web/package.json        apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json     packages/db/package.json
RUN pnpm install --frozen-lockfile

# --- source -------------------------------------------------------------------
COPY . .

# API listens on $PORT (set by docker-compose); harmless for the worker service.
EXPOSE 4000

# Default role = API server. The worker service overrides this with:
#   pnpm --filter @rotpitch/api start:worker
CMD ["pnpm", "--filter", "@rotpitch/api", "start"]
