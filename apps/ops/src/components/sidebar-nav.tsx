'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { cn } from '@pe/ui';
import { PRIMARY_NAV } from '@/lib/nav-items';
import logo from '../../public/brand/logo.png';

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden shrink-0 border-r bg-muted/20 md:flex md:w-60 md:flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/today" className="flex items-center gap-2" aria-label="Performance East ops home">
          <Image
            src={logo}
            alt="Performance East"
            sizes="180px"
            className="h-auto w-[168px]"
            priority
          />
        </Link>
      </div>

      <div className="border-b px-3 py-3">
        <a
          href={
            process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.performanceeast.com'
          }
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span>Portal</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/today' && pathname.startsWith(item.href.split('/').slice(0, 2).join('/')));
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
      </nav>
    </aside>
  );
}
