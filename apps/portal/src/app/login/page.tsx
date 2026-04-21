import { redirect } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pe/ui';
import { getUser } from '@pe/auth';
import { LoginForm } from './login-form';
import logo from '../../../public/brand/logo.png';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect('/');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-4 text-center">
          <Image
            src={logo}
            alt="Performance East"
            priority
            sizes="280px"
            className="h-auto w-[240px] sm:w-[280px]"
          />
          <div className="space-y-1.5">
            <CardTitle>Performance East Portal</CardTitle>
            <CardDescription>
              Sign in with your work Google account or request a one-time email link.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
