#!/usr/bin/env bash
# Generate Supabase TypeScript types straight into packages/shared/src/db-types.ts
# so both apps consume the same generated Database type.
#
# Requires SUPABASE_PROJECT_ID (project ref) in the environment, plus a logged-in
# Supabase CLI (`supabase login`). Run from the repo root: `pnpm db:gen-types`.
set -euo pipefail

if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "error: SUPABASE_PROJECT_ID is not set (see .env.example)" >&2
  exit 1
fi

OUT="$(cd "$(dirname "$0")/../../shared/src" && pwd)/db-types.ts"

echo "Generating Supabase types for project ${SUPABASE_PROJECT_ID} -> ${OUT}"
pnpm dlx supabase gen types typescript \
  --project-id "${SUPABASE_PROJECT_ID}" \
  --schema public \
  > "${OUT}"

echo "Done. Wrote ${OUT}"
