import { notFound } from 'next/navigation';
import { requireUserContext } from '@pe/auth';

/**
 * Gate the entire /admin section to owner + gm (which covers Ops Manager + HR
 * since both are seeded with default_app_role='gm'). Non-admins get a 404 so
 * the route doesn't advertise its existence.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUserContext();
  if (!ctx.isAdmin) notFound();
  return <>{children}</>;
}
