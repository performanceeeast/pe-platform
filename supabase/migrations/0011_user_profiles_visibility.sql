-- Open user_profiles SELECT to all authenticated users so admin lists,
-- salesperson dropdowns, leaderboards, deal lists, hit-list "sold by"
-- attribution, handoff performance, etc. all work for non-admins viewing
-- other employees. Names + email + role are non-sensitive within a single
-- dealership of ~20 employees who already need to see each other to do
-- their jobs.
--
-- Before this migration the only SELECT policy was auth.uid() = id, which
-- meant invited users showed up in the database (admin actions write via
-- service role and bypass RLS) but the master /admin/users list could not
-- read them back through the user-scoped client.
--
-- Self-insert + self-update stay intact. Adds an admin-update policy so the
-- admin UI doesn't have to rely exclusively on service-role bypass.

drop policy if exists "user_profiles self select" on public.user_profiles;

create policy "user_profiles read authenticated"
  on public.user_profiles for select
  to authenticated
  using (true);

create policy "user_profiles admin update"
  on public.user_profiles for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
