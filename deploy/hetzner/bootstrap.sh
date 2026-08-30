#!/usr/bin/env bash
#
# RotPitch — one-shot bootstrap for a fresh Ubuntu 24.04 VPS (Hetzner CX32+).
#
# Installs Docker, locks down the firewall, clones the repo and brings up the
# backend stack (redis + api + worker) behind Caddy TLS.
#
# Run as root on a brand-new box:
#
#   curl -fsSL https://raw.githubusercontent.com/Anand-sahni/Rotpitch/main/deploy/hetzner/bootstrap.sh | bash
#
# ...or, more safely, clone first and run it locally:
#
#   git clone https://github.com/Anand-sahni/Rotpitch.git /opt/rotpitch
#   bash /opt/rotpitch/deploy/hetzner/bootstrap.sh
#
# Idempotent — safe to re-run. It will NOT overwrite an existing .env.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Anand-sahni/Rotpitch.git}"
APP_DIR="${APP_DIR:-/opt/rotpitch}"
BRANCH="${BRANCH:-main}"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (or with sudo)." >&2
  exit 1
fi

log "Installing Docker, compose plugin and git"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin git ufw curl

systemctl enable --now docker

log "Configuring firewall (ufw)"
# Note: Docker's iptables rules bypass ufw for PUBLISHED ports. The compose file
# deliberately binds the API to 127.0.0.1 so only Caddy (80/443) is public.
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP (Caddy / ACME challenge)'
ufw allow 443/tcp   comment 'HTTPS (Caddy -> api)'
ufw --force enable
ufw status verbose

log "Fetching the repo into ${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch --all --quiet
  git -C "${APP_DIR}" checkout "${BRANCH}" --quiet
  git -C "${APP_DIR}" pull --ff-only --quiet
else
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi
cd "${APP_DIR}"

log "Wiring the Caddy TLS overlay"
# compose auto-loads docker-compose.override.yml; symlink keeps it in sync with git.
ln -sfn deploy/docker-compose.caddy.yml docker-compose.override.yml

if [[ ! -f .env ]]; then
  cp .env.example .env
  cat <<'MSG'

  .env was created from .env.example and is NOT yet filled in.

  Edit /opt/rotpitch/.env and set at minimum:
    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    S3_ENDPOINT (https://<r2_account_id>.r2.cloudflarestorage.com)
    AWS_REGION=auto, S3_OUTPUT_BUCKET
    AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  (R2 read+write token)
    WEB_ORIGIN=https://rotpitch.com
    OPENAI_API_KEY   (captions)
    DODO_* keys      (billing; use test_mode until verified)

  Then run:  cd /opt/rotpitch && docker compose up -d --build

MSG
  exit 0
fi

log "Building and starting the stack"
docker compose up -d --build

log "Waiting for the API to answer /health"
for i in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:4000/health >/dev/null 2>&1; then
    echo "API healthy after ${i}s"
    break
  fi
  sleep 1
  [[ $i -eq 30 ]] && { echo "API did not become healthy — check: docker compose logs api"; exit 1; }
done

docker compose ps
log "Done. Point api.rotpitch.com at this box's IP; Caddy will issue the TLS cert on first request."
