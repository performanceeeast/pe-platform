'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export interface StoreThemeProps {
  /** Valid store slugs the app recognises. */
  storeSlugs: string[];
  /** Slug to apply when the URL isn't store-scoped (e.g. /resources, /targets). */
  fallbackStoreSlug: string | null;
}

/**
 * Mirrors the current store slug (from the URL) onto `<html data-store="…">`
 * so CSS variables in globals.css can re-theme accent colors. Mounted once in
 * the authed layout — renders nothing.
 */
export function StoreTheme({ storeSlugs, fallbackStoreSlug }: StoreThemeProps) {
  const pathname = usePathname();

  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean);
    const urlSlug = parts[0] && storeSlugs.includes(parts[0]) ? parts[0] : null;
    const active = urlSlug ?? fallbackStoreSlug;
    const root = document.documentElement;
    if (active) {
      root.setAttribute('data-store', active);
    } else {
      root.removeAttribute('data-store');
    }
  }, [pathname, storeSlugs, fallbackStoreSlug]);

  return null;
}
