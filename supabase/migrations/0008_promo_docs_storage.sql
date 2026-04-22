-- Create the storage bucket that promo_docs.storage_path points to.
--
-- Public bucket: dealership rebate / financing PDFs are marketing material,
-- not sensitive data, so we skip storage-level RLS and gate the listing /
-- delete surface via promo_docs table RLS (already enforced).
--
-- Path convention: "<store_id>/<filename>" for store-scoped docs, or
-- "global/<filename>" for cross-store docs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promo-docs',
  'promo-docs',
  true,
  20 * 1024 * 1024, -- 20 MB
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object-level policies on storage.objects for this bucket:
--   select: any authenticated user (public bucket, so anonymous can also
--           read via the public CDN URL — that's the whole point)
--   insert / update / delete: admin or sales_manager (mirrors the
--           promo_docs table's own manage policy)

drop policy if exists "promo_docs objects read" on storage.objects;
create policy "promo_docs objects read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'promo-docs');

drop policy if exists "promo_docs objects write" on storage.objects;
create policy "promo_docs objects write"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'promo-docs'
    and (
      public.current_user_is_admin()
      or public.current_user_has_role_slug('sales_manager')
    )
  )
  with check (
    bucket_id = 'promo-docs'
    and (
      public.current_user_is_admin()
      or public.current_user_has_role_slug('sales_manager')
    )
  );
