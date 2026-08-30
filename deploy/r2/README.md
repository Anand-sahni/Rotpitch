# deploy/r2 — Cloudflare R2 (outputs storage)

Current production storage for finished renders. R2 is S3-compatible, so the app's
existing `@aws-sdk/client-s3` code targets it by setting `S3_ENDPOINT` +
`AWS_REGION=auto` (see `DEPLOY.md` §1 and `.env.example`).

- **`cors.json`** — paste into R2 bucket → **Settings → CORS policy**. Update the
  origins to your real Vercel/custom domains.
- **Credentials** — R2 → *Manage R2 API Tokens*. Create two tokens scoped to the
  outputs bucket: a **read+write** token for the VPS api/worker, and a
  **read-only** token for the Vercel web (presign only). No instance-role concept
  off AWS — both go in `.env` / Vercel env as `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY`.

> The sibling `deploy/aws/` folder (EC2 IAM policies, S3 CORS) is **obsolete** —
> kept only as reference from the prior AWS deployment.
