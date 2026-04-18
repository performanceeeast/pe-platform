import { redirect } from 'next/navigation';
import { getUser } from '@pe/auth';

export default async function RootPage() {
  const user = await getUser();
  redirect(user ? '/today' : '/login');
}
