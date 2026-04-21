import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pe/ui';
import { requireUserContext } from '@pe/auth';
import { signOut } from '../actions/auth';

export const metadata: Metadata = {
  title: 'Account pending',
};

export default async function OnboardingPage() {
  const ctx = await requireUserContext();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle>Welcome to Performance East</CardTitle>
          <CardDescription>
            Your account ({ctx.user.email}) hasn&apos;t been assigned a role yet. An
            administrator needs to finish setting you up before you can access a
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Sign out
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
