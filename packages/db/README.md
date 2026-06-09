# @rotpitch/db

Supabase schema, SQL migrations, and the type-generation script.

## Migrations

Plain SQL under `migrations/`, applied in lexical order:

| File | Purpose |
|---|---|
| `0001_init.sql` | Enums, 4 tables, indexes, RLS (own-row read policies). |
| `0002_signup_trigger.sql` | `auth.users` insert trigger → provisions Free profile + 1 free credit + signup ledger row. |

### Applying

This package targets a hosted Supabase project. Either:

- Paste each migration into the Supabase SQL editor in order, **or**
- Use the Supabase CLI with a linked project (`supabase link`) and `supabase db push`.

> RLS protects client reads (anon key). All privileged writes run from
> `apps/api` with the service-role key, which bypasses RLS — gating/credit
> logic is enforced there, not in policies.

## Generating types

```bash
# repo root, with SUPABASE_PROJECT_ID set and `supabase login` done
pnpm db:gen-types
```

Writes the generated `Database` type to `packages/shared/src/db-types.ts`, which
both apps import via `@rotpitch/shared/db`.
