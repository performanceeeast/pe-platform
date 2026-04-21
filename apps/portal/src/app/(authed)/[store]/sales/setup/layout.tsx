import { redirect } from 'next/navigation';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { canManageSalesConfig } from '@/lib/sales-access';

interface SetupLayoutProps {
  children: React.ReactNode;
  params: { store: string };
}

export default async function SetupLayout({ children, params }: SetupLayoutProps) {
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  if (!(await canManageSalesConfig())) {
    redirect(`/${store.slug}/sales`);
  }

  return <>{children}</>;
}
