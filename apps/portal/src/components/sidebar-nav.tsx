'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@pe/ui';
import {
  GLOBAL_NAV,
  ADMIN_NAV,
  ADMIN_STORE_NAV,
  HOME_ICON,
  type NavItem,
} from '@/lib/nav-items';
import logo from '../../public/brand/logo.png';

export interface SidebarNavProps {
  homeHref: string;
  homeLabel: string;
  isAdmin: boolean;
  /** All slugs the user can switch between — used to detect the current store. */
  storeSlugs: string[];
  /** Fallback when the URL isn't store-scoped (e.g. /resources). */
  fallbackStoreSlug: string | null;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-pe-red-500 text-white hover:bg-pe-red-600'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    </li>
  );
}

export function SidebarNav({
  homeHref,
  homeLabel,
  isAdmin,
  storeSlugs,
  fallbackStoreSlug,
}: SidebarNavProps) {
  const pathname = usePathname();

  const storeSet = new Set(storeSlugs);
  const parts = pathname.split('/').filter(Boolean);
  const urlStoreSlug = parts[0] && storeSet.has(parts[0]) ? parts[0] : null;
  const activeStoreSlug = urlStoreSlug ?? fallbackStoreSlug;

  const adminSubItems: NavItem[] = isAdmin && activeStoreSlug
    ? ADMIN_STORE_NAV.map(({ sub, label, icon }) => ({
        href: `/${activeStoreSlug}/admin${sub}`,
        label,
        icon,
      }))
    : [];

  const isHomeActive =
    !isAdmin &&
    (pathname === homeHref ||
      (homeHref !== '/' && pathname.startsWith(homeHref + '/')));

  return (
    <aside className="hidden shrink-0 border-r bg-muted/20 md:flex md:w-60 md:flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Link href={homeHref} className="flex items-center gap-2" aria-label="Performance East portal home">
          <Image
            src={logo}
            alt="Performance East"
            sizes="180px"
            className="h-auto w-[168px]"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {isAdmin ? (
          <ul className="space-y-1">
            {adminSubItems.map((item, idx) => {
              const Icon = item.icon;
              // "Today" is /[store]/admin exactly — don't match deeper paths.
              const exact = idx === 0;
              const active = exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-pe-red-500 text-white hover:bg-pe-red-600'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="space-y-1">
            <li>
              <Link
                href={homeHref}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isHomeActive
                    ? 'bg-pe-red-500 text-white hover:bg-pe-red-600'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <HOME_ICON className="h-4 w-4" />
                {homeLabel}
              </Link>
            </li>
          </ul>
        )}

        <ul className="space-y-1">
          {GLOBAL_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>

        {isAdmin ? (
          <div>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            <ul className="space-y-1">
              {ADMIN_NAV.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </ul>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
