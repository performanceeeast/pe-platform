'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pe/ui';

export interface StoreSwitcherProps {
  stores: Array<{ id: string; slug: string; name: string }>;
  /** The user's primary store slug — used as the switcher value when the
   *  current URL isn't store-scoped (e.g. /resources, /targets). */
  fallbackStoreSlug: string | null;
  /** Department slug to land on when switching from a non-store-scoped page. */
  defaultDepartmentSlug: string;
}

export function StoreSwitcher({
  stores,
  fallbackStoreSlug,
  defaultDepartmentSlug,
}: StoreSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (stores.length <= 1) {
    const only = stores[0];
    if (!only) return null;
    return (
      <span className="text-sm font-medium text-muted-foreground">{only.name}</span>
    );
  }

  const storeSlugs = new Set(stores.map((s) => s.slug));
  const parts = pathname.split('/').filter(Boolean);
  const urlStoreSlug = parts[0] && storeSlugs.has(parts[0]) ? parts[0] : null;
  const currentSlug = urlStoreSlug ?? fallbackStoreSlug ?? stores[0]!.slug;

  function handleChange(newSlug: string) {
    if (urlStoreSlug) {
      const next = [...parts];
      next[0] = newSlug;
      router.push('/' + next.join('/'));
    } else {
      router.push(`/${newSlug}/${defaultDepartmentSlug}`);
    }
  }

  return (
    <Select value={currentSlug} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-40">
        <SelectValue placeholder="Select store" />
      </SelectTrigger>
      <SelectContent>
        {stores.map((s) => (
          <SelectItem key={s.id} value={s.slug}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
