import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pe/ui';
import { getUser } from '@pe/auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect('/today');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 inline-flex rounded-full bg-pe-blue-500 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
            Performance East
          </div>
          <CardTitle>Ops dashboard</CardTitle>
          <CardDescription>
            Sign in with your work Google account or request a one-time email link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
