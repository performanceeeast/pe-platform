# PE Platform

The Performance East multi-app platform. A Turborepo monorepo hosting five
Next.js 14 apps sharing a common UI, database, auth, and branding layer.

```
apps/
  ops/        GM operations dashboard (real functionality today)
  portal/     performanceeast.com landing / router (placeholder)
  sales/      future home of pe-sales-dashboard (placeholder)
  service/    service department dashboard (placeholder)
  parts/      parts department dashboard (placeholder)
packages/
  branding/   PE Blue color scale, typography tokens, CSS vars
  config/     shared tsconfig, ESLint (next), Tailwind preset
  ui/         shadcn/ui primitives + PE wrappers (TaskCard etc.)
  database/   Supabase client factories + generated TS types
  auth/       requireUser/getUser helpers + owner-email bootstrap
supabase/
  migrations/ versioned SQL migrations (0001_initial, 0002_*)
```

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 10+ (`npm install -g pnpm`)
- A Supabase project (we ship with `pe-platform` already provisioned)
- Vercel account for deploys

## First-time setup

```bash
pnpm install

# Copy env template and fill in Supabase credentials
cp apps/ops/.env.example apps/ops/.env.local
# Then edit apps/ops/.env.local and paste the real values from
# https://supabase.com/dashboard/project/<ref>/settings/api
```

## Running locally

```bash
# Everything in parallel
pnpm dev

# Or one app at a time
pnpm --filter @pe/ops dev        # http://localhost:3000
pnpm --filter @pe/portal dev     # http://localhost:3001
pnpm --filter @pe/sales dev      # http://localhost:3002
pnpm --filter @pe/service dev    # http://localhost:3003
pnpm --filter @pe/parts dev      # http://localhost:3004
```

## Common commands

```bash
pnpm build       # build every app
pnpm typecheck   # tsc --noEmit across the workspace
pnpm lint        # next lint per app
pnpm format      # prettier --write
```

## Ops dashboard routes

| Route | Purpose |
| --- | --- |
| `/login` | Google OAuth + magic-link auth |
| `/today` | Greeting, quick-add, P0/P1 & P2/P3 lists, calendar |
| `/kanban` | Drag-and-drop board (skeleton; implementation pending) |
| `/department/[dept]` | Open tasks for a department (sales, service, …) |
| `/projects`, `/projects/[id]` | Projects list + detail with linked tasks |
| `/notes` | Handwritten notes archive (empty until iPad pipeline) |
| `/settings` | Profile + integration statuses |

## Supabase

- Project: `pe-platform` (ref `lnvmtmtgjzhghldvokdg`) in org Performance East
- Migrations live in `supabase/migrations/`. Apply new ones with the Supabase
  CLI or the dashboard SQL editor.
- After a schema change, regenerate types:
  ```bash
  PE_SUPABASE_PROJECT_ID=lnvmtmtgjzhghldvokdg pnpm --filter @pe/database gen:types
  ```
- RLS is scoped to `auth.uid() = created_by` on every user-generated table.
  Role-based policies come later with the portal.

## Owner bootstrap

The first person to log in whose email matches `OWNER_EMAIL`
(default `mfleetwood@performanceeast.com`) is written to `user_profiles`
with `role='owner'`. Everyone else lands as `role='employee'`. Update the
env var before that first login if you need a different owner.

## Adding a new app

1. Copy an existing placeholder app (e.g. `apps/parts/`) to `apps/<new>/`.
2. Rename the package in its `package.json` to `@pe/<new>`, bump the dev port.
3. `pnpm install` at the root.
4. Add a Vercel project with Root Directory `apps/<new>` — see
   [DEPLOYMENT.md](./DEPLOYMENT.md).

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Vercel-per-app setup and
domain wiring.
