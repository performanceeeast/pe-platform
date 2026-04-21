'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@pe/ui';
import { GLOBAL_NAV, ADMIN_NAV, HOME_ICON, type NavItem } from '@/lib/nav-items';
import logo from '../../public/brand/logo.png';

export interface SidebarNavProps {
  homeHref: string;
  homeLabel: string;
  isAdmin: boolean;
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

export function SidebarNav({ homeHref, homeLabel, isAdmin }: SidebarNavProps) {
  const pathname = usePathname();

  const isHomeActive =
    pathname === homeHref ||
    (homeHref !== '/' && pathname.startsWith(homeHref + '/'));

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

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
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
