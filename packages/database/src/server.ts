import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Server-side Supabase client for React Server Components, Route Handlers, and
 * Server Actions. Always call this inside the request scope so Next.js cookies
 * can be read/written correctly.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            // Called from a Server Component — cookie writes must happen in
            // Server Actions or Route Handlers. Middleware handles session
            // refresh, so this is safe to swallow.
          }
        },
      },
    },
  );
}
