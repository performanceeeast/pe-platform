# Deployment

pe-platform is a Turborepo monorepo. Each app deploys as its **own** Vercel
project pointing at the same GitHub repo with a different Root Directory.

## One-time: GitHub

Create `github.com/performanceeeast/pe-platform` (private) and push:

```bash
# Option A — with gh CLI
gh repo create performanceeeast/pe-platform --private --source=. --remote=origin
git push -u origin main

# Option B — manually
# 1. Create the repo on github.com (empty, no README)
# 2. git remote add origin git@github.com:performanceeeast/pe-platform.git
# 3. git push -u origin main
```

## Vercel projects (5 total)

For each app below, create a Vercel project on the `performanceeeasts-projects`
team with these settings:

| App | Project name | Root Directory | Domain |
| --- | --- | --- | --- |
| ops | `pe-platform-ops` | `apps/ops` | `ops.performanceeast.com` |
| portal | `pe-platform-portal` | `apps/portal` | `portal.performanceeast.com` |
| sales | `pe-platform-sales` | `apps/sales` | `sales.performanceeast.com` |
| service | `pe-platform-service` | `apps/service` | `service.performanceeast.com` |
| parts | `pe-platform-parts` | `apps/parts` | `parts.performanceeast.com` |

**Per-project Vercel settings:**
- Framework: Next.js
- Build command: leave default (Vercel auto-detects)
- Install command: `pnpm install` (Vercel detects pnpm via `packageManager`)
- Root Directory: as above
- Include source files outside of the Root Directory: **enable** — Turborepo
  needs workspace packages at `../../packages/*` to build.
- Node.js version: 20.x

## Environment variables

Only `apps/ops` needs Supabase + owner env vars today. Future apps will get
their own once they start using Supabase.

On the `pe-platform-ops` Vercel project, set the following for all
environments (Production, Preview, Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://lnvmtmtgjzhghldvokdg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role key — Production only>
NEXT_PUBLIC_APP_URL=https://ops.performanceeast.com
OWNER_EMAIL=mfleetwood@performanceeast.com
```

Get the keys at
https://supabase.com/dashboard/project/lnvmtmtgjzhghldvokdg/settings/api.

## Supabase auth redirect allow-list

In the Supabase dashboard → Authentication → URL Configuration → Redirect URLs,
add:

```
https://ops.performanceeast.com/auth/callback
https://ops.performanceeast.com/**
http://localhost:3000/**
```

Then add the Google OAuth provider (Authentication → Providers → Google),
pasting your Google Cloud OAuth client ID + secret. The Google Cloud console's
authorized redirect URI is
`https://lnvmtmtgjzhghldvokdg.supabase.co/auth/v1/callback`.

## Custom domains

For each production domain:
1. In the Vercel project → Settings → Domains, add the subdomain.
2. Vercel shows the DNS record to create (CNAME to `cname.vercel-dns.com`).
3. Add the record at whatever provider hosts `performanceeast.com`.
4. Wait for SSL to provision (usually under a minute).

## Deploy pipeline

- Push to `main` → Vercel deploys every project whose Root Directory has
  changed files (via "Ignored Build Step" auto-detection, or set it manually
  per project if needed).
- Pull requests get preview deployments per app.

## Troubleshooting

- **Build fails with `Cannot find module '@pe/...'`**: verify
  "Include source files outside of the Root Directory" is enabled on the
  Vercel project.
- **Build fails with `Module not found: '@pe/config/tailwind'`**: confirm the
  app's `next.config.mjs` includes the package in `transpilePackages`.
- **/auth/callback returns `error=missing_code`**: the OAuth redirect URI
  isn't on Supabase's allow-list for that domain.

## Adding new Supabase migrations

```bash
# Write the migration SQL file at supabase/migrations/NNNN_name.sql
# Apply it via the Supabase MCP, CLI, or SQL editor
# Regenerate types
PE_SUPABASE_PROJECT_ID=lnvmtmtgjzhghldvokdg pnpm --filter @pe/database gen:types
# Commit the migration + types update together
```
