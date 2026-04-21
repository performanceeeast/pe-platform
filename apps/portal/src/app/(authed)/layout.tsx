import Image from 'next/image';
import Link from 'next/link';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { SidebarNav } from '@/components/sidebar-nav';
import { StoreSwitcher } from '@/components/store-switcher';
import { UserMenu } from '@/components/user-menu';
import logo from '../../../public/brand/logo.png';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUserContext();
  const landing = getLandingPath(ctx);
  const defaultDepartmentSlug = ctx.role?.department ?? 'admin';
  const roleLabel = ctx.role?.name ?? ctx.profile.role;

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav homeHref={landing} homeLabel="Home" isAdmin={ctx.isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Link href={landing} className="md:hidden" aria-label="Performance East portal home">
            <Image
              src={logo}
              alt="Performance East"
              sizes="140px"
              className="h-auto w-[140px]"
              priority
            />
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <StoreSwitcher
              stores={ctx.stores}
              fallbackStoreSlug={ctx.primaryStore?.slug ?? null}
              defaultDepartmentSlug={defaultDepartmentSlug}
            />
            <UserMenu
              email={ctx.profile.email ?? ctx.user.email ?? null}
              fullName={ctx.profile.full_name}
              roleLabel={roleLabel}
            />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
