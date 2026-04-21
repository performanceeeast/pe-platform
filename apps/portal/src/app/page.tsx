import { redirect } from 'next/navigation';
import { getUserContext, getLandingPath } from '@pe/auth';

export default async function RootPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  redirect(getLandingPath(ctx));
}
