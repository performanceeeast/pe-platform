/**
 * Build the public storage URL for a promo-docs path without going through
 * `supabase.storage.getPublicUrl`. A whitespace/encoding bug in one build of
 * the SDK was producing hrefs with a leading space (%20), which the browser
 * then resolved against the current page and 404'd. Constructing it by hand
 * from the env var removes that failure mode.
 */
const BASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .trim()
  .replace(/\/$/, '');

export function promoPublicUrl(storagePath: string): string {
  const clean = storagePath.trim();
  return `${BASE_URL}/storage/v1/object/public/promo-docs/${encodeURI(clean)}`;
}
