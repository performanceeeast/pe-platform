# PE Platform — Claude Code Onboarding

If you're a new Claude Code agent picking up this project, **read this file
end to end before you do anything else**. The codebase is large and the
architectural decisions below are not always obvious from the source.

The user is **Matthew Fleetwood**, owner / GM of Performance East
(`mfleetwood@performanceeast.com`). PE is a powersports + marine dealership
in eastern North Carolina with two store locations: **Goldsboro** (powersports
+ marine) and **Cedar Point** (marine).

---

## What this is

A Turborepo monorepo whose real product is the **employee portal** at
`pe-platform-portal.vercel.app` (eventually `portal.performanceeast.com`).
Everyone in the company logs in once and lands on a role-scoped dashboard
for their store + department. Other `apps/*` directories are scaffolding.

```
apps/
  portal/     ← THE app. All real work happens here.
  ops/        Old standalone ops dashboard. Fully ported into portal — safe to archive.
  sales/      Empty stub. Sales lives inside portal at /[store]/sales/*.
  service/    Empty stub.
  parts/      Empty stub.
packages/
  ui/         shadcn primitives + PE wrappers (PageHeader, DepartmentBadge, …)
  database/   Supabase client factories + generated `Database` types
  auth/       getUserContext, requireUserContext, role helpers
  branding/   color scale + typography tokens
  config/     tsconfig, eslint, tailwind preset
supabase/
  migrations/ Versioned SQL — 0001 initial, …, 0010 most recent at time of writing.
```

---

## Current state (as of 2026-04-22)

✅ **Ops dashboard** — ported into portal at `/[store]/admin/*` (today,
kanban, projects, notes, settings).

✅ **Sales module** — fully usable end-to-end:
- Setup surfaces for Ops Manager / Sales Manager: monthly goals, PG&A
  tiers, back-end spiffs, contests, hit list (CSV/XLSX import), promo hub
  (PDF upload).
- Salesperson workflow: deal entry with hit-list auto-match, deal list
  (role-scoped), deal detail with finance back-end + F&I checkboxes.
- Dashboards: sales landing with goal progress / leaderboard / contests /
  promos; dedicated PG&A leaderboard at `/[store]/sales/leaderboard`
  (monthly + YTD).

🚧 **Manager dashboards** — not built yet. Sales Manager pipeline health,
F&I KPIs, Internet Sales Manager appt log + daily lead counts. Schema is
live (`appointments`, `daily_lead_counts`, `traffic_log`); UI pending.

📋 **Other departments (service, parts, F&I)** — placeholder pages only.
Build out one at a time after sales.

---

## Where everything lives

| Thing | Location |
| --- | --- |
| Repo | `github.com/performanceeeast/pe-platform` (note **triple-e**) |
| Vercel team | `performanceeeasts-projects` (id `team_0cc52iQzKaOFL6G4my4mx07d`) |
| Vercel project (portal) | `pe-platform-portal` (id `prj_k9j7uIgH7zaaUA5sSP7BkAY6iLX3`) |
| Live URL | `https://pe-platform-portal.vercel.app` |
| Supabase org | Performance East (`xmcypsbcxfwzfbtofrld`) |
| Supabase project | `pe-platform` (`lnvmtmtgjzhghldvokdg`, us-east-1) |
| Reference: legacy sales dashboard | `pe-sales-dashboard.vercel.app` |
| Reference: legacy sales tracker repo | `peg-sales-tracker` (Matthew's local Downloads) |

The repo is hooked to Vercel via GitHub — pushing to `main` auto-deploys.

---

## Stack

- Next.js 14 App Router (RSC), TypeScript strict
- Tailwind + shadcn/ui (primitives in `packages/ui`)
- Supabase: auth (Google OAuth + magic link), Postgres + RLS, Storage
- pnpm workspace + Turborepo
- Vercel deploys

---

## Architectural decisions worth preserving

These are the non-obvious ones. Codebase will follow these patterns;
break them at your peril without checking with Matthew.

### Portal owns everything (Option A)
Every department dashboard, including ones that *could* be a separate
sub-app, is a route inside the portal. No cross-subdomain link-outs.
Decided 2026-04-18, extended 2026-04-21. Don't propose splitting unless
asked.

### Roles + role grants
Each user has one **primary role** via `user_profiles.role_id` (drives
display + default `app_role` enum). Cedar Point's manager wears two
hats — Sales Manager + F&I Manager — handled via the **`user_role_grants`**
junction table (additive). The helper
`current_user_has_role_slug(slug)` checks both. Don't invent new combined
roles; grant additional roles instead.

### Store-scoped lookups
`unit_types`, `fni_products`, `lead_sources` are per-store tables (not
enums). Goldsboro and Cedar Point have different product mixes. When
you need a new dropdown option, add a row to the seed migration —
don't hardcode in the UI.

### Sales deal flow (dual-entry)
Either side can start a deal:
- Salesperson logs front-end (date, customer, deal#, salesperson, unit
  type, stock#, PG&A) → `status='pending_finance'`.
- Finance manager logs back-end (reserve, back-end total, F&I products)
  → `status='pending_salesperson'` if no front-end yet.

The detail page at `/[store]/sales/deals/[id]` shows both sections; the
server action auto-derives status from what's filled. "Delivered" is a
manual checkbox.

### Hit list auto-match
The hit list (aged inventory > 120 days) is **import-driven** from
LightSpeed DMS exports — Matthew uploads CSV/XLSX with stock_number,
year, make, model_name, date_in_stock. DMS doesn't know spiff amounts,
so he sets them inline after import via the per-row input + "Apply to
all unsold" helper.

When a salesperson logs a deal with `stock_number` that matches an unsold
`aged_inventory` row, `saveDeal` server action sets `sold_by_user_id`
+ `sold_at` and the confirmation message reads "Hit-list spiff earned:
$X". This is in `apps/portal/src/app/(authed)/[store]/sales/deals/new/actions.ts`.

### promo-docs storage URL workaround
Supabase JS SDK's `storage.getPublicUrl` was injecting a **leading space**
in the production build, 404'ing every promo link. We use
`apps/portal/src/lib/promo-url.ts` (`promoPublicUrl`) which builds the
URL from `NEXT_PUBLIC_SUPABASE_URL` directly. **Do not revert** to the
SDK helper without testing in Vercel prod first.

### RLS patterns
- `current_user_is_admin()` → owner + gm (Ops Manager has gm app_role).
- `current_user_has_store_access(store_id)` → user_store_access membership
  OR admin.
- `current_user_can_manage_sales_config(store_id)` → admin OR
  sales_manager (primary or granted) with store access.
- `current_user_can_edit_deal(deal_id)` → admin OR participant
  (salesperson/finance mgr) OR sales/F&I mgr in store.

Most table policies follow:
- **read** = store access
- **write** = admin OR specific role + store access

### Commit style + workflow
Small commits with clear messages so Matthew can follow along and roll
back. Co-author tag:
```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Matthew doesn't run local dev
We ship via `git push` → Vercel auto-deploys → he refreshes
`pe-platform-portal.vercel.app`. Don't tell him to `pnpm dev`. Local
typecheck (`npx tsc --noEmit` from `apps/portal`) before commit is fine
and doesn't need a server.

---

## Sales route map

```
/[store]/sales                     → dashboard (goals, leaderboard, contests, promos)
/[store]/sales/deals               → list (role-scoped)
/[store]/sales/deals/new           → front-end entry form
/[store]/sales/deals/[id]          → detail w/ finance back-end + F&I checkboxes
/[store]/sales/leaderboard         → PG&A $ board, month + YTD
/[store]/sales/setup               → Ops Manager / Sales Manager hub
  /setup/goals                     → unit-type targets, stretch, payouts
  /setup/pga                       → PG&A spiff tiers (variable rows)
  /setup/spiffs                    → back-end product spiffs + all-products bonus
  /setup/contests                  → monthly contests w/ winner dropdown
  /setup/hit-list                  → CSV/XLSX import + inline spiff editing
  /setup/promos                    → PDF upload + active promo list
```

---

## What to read first when picking up this project

1. **This file.**
2. `supabase/migrations/0003_portal_foundation.sql` — stores, roles,
   user_store_access, helper functions, RLS baseline.
3. `supabase/migrations/0004_sales_role_grants_and_lookups.sql` →
   `0010_aged_inventory_year_make_model.sql` — sales schema.
4. `packages/auth/src/context.ts` — how UserContext is assembled.
5. `apps/portal/src/lib/sales-access.ts` — the `canManageSalesConfig` gate.
6. `apps/portal/src/app/(authed)/[store]/sales/deals/new/actions.ts` —
   deal entry + hit-list auto-match logic.

---

## What's next

Step 4 of the build plan: **manager-specific dashboards**.
- **Sales Manager pipeline health** — read `appointments` + `traffic_log`
  + `deals` to show conversion funnels per rep, stale leads, single-
  threaded deals, etc.
- **F&I KPI panel** — penetration % per product, average back-end per
  deal, commission tier (mirroring the legacy peg-sales-tracker logic
  at a high level).
- **Internet Sales Manager** surfaces — appt log entry/edit, daily lead
  counts (schema lives, UI doesn't).

Step 5: accountability tasks + delivery checklist (placeholders OK
per the original reference doc).

Future: real F&I menu builder (port from `peg-sales-tracker`'s
warranty-rate engine).

---

## Setting up Claude Code on a new machine

1. Install Claude Code CLI and authenticate with the team account.
2. Clone the repo: `git clone https://github.com/performanceeeast/pe-platform`.
3. `cd` into the repo and start a session — Claude Code reads this file
   automatically (it's at the repo root).
4. Memory files at `~/.claude/projects/<encoded-path>/memory/` from the
   previous machine **are not in the repo**. The summary content of
   those memories is captured in this onboarding doc, so a fresh agent
   can rebuild context from here.
5. For local typechecks (Matthew doesn't run dev), set up env via
   `apps/portal/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://lnvmtmtgjzhghldvokdg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase dashboard>
   SUPABASE_SERVICE_ROLE_KEY=<only if testing /admin/users invites>
   NEXT_PUBLIC_APP_URL=http://localhost:3001
   OWNER_EMAIL=mfleetwood@performanceeast.com
   ```
6. Vercel env vars must be set on the `pe-platform-portal` project for
   production builds to work. They're already configured; if a new
   deploy fails on `process.env.NEXT_PUBLIC_SUPABASE_URL` being
   undefined, that's where to look.

---

## House rules / preferences

- Default to **commit + push** over "test it locally."
- Never amend commits unless explicitly asked.
- Never force-push to `main`.
- Keep RLS in sync with UI — every new table needs a thoughtful read +
  write policy. Use existing helpers
  (`current_user_is_admin`, `current_user_has_store_access`,
  `current_user_has_role_slug`, `current_user_can_manage_sales_config`).
- Run `npx tsc --noEmit` from `apps/portal` before committing UI changes.
- Run Supabase advisors (`get_advisors` MCP) after every schema change.
- Use the Supabase MCP for migrations (`apply_migration`), not raw
  `execute_sql`, so they're versioned.
- DNS for `performanceeast.com` is managed by Dealer Spike — domain
  changes require a ticket, not a self-serve DNS edit.
