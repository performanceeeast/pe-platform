import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pe/ui';
import { requireUserContext } from '@pe/auth';
import { signOut } from '../actions/auth';

export const metadata: Metadata = {
  title: 'No store access',
};

export default async function NoAccessPage() {
  const ctx = await requireUserContext();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle>No store access</CardTitle>
          <CardDescription>
            {ctx.user.email} has a role but isn&apos;t assigned to a store yet. Ask an
            administrator to grant you access to Goldsboro, Cedar Point, or both.
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
