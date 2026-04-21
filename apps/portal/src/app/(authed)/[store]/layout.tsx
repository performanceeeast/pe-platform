import { notFound, redirect } from 'next/navigation';
import { requireUserContext, getLandingPath } from '@pe/auth';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { store: string };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const ctx = await requireUserContext();

  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) {
    // Slug isn't a real store — 404. If they're hitting a real store they
    // don't have access to, bounce to their own landing page.
    const anyStoreWithSlug = ctx.stores.length > 0;
    if (anyStoreWithSlug) redirect(getLandingPath(ctx));
    notFound();
  }

  return <>{children}</>;
}
