'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Separator } from '@pe/ui';
import { createClient } from '@pe/database/client';
import { sendMagicLink } from '../actions/auth';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    { tone: 'info' | 'error' | 'success'; message: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  async function handleGoogle() {
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus({ tone: 'error', message: error.message });
    } else {
      router.refresh();
    }
  }

  function handleMagicLink(formData: FormData) {
    setStatus(null);
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      setStatus(
        result.ok
          ? { tone: 'success', message: result.message }
          : { tone: 'error', message: result.error },
      );
    });
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="w-full"
        onClick={handleGoogle}
      >
        Continue with Google
      </Button>

      <div className="relative flex items-center">
        <Separator className="flex-1" />
        <span className="px-3 text-xs uppercase tracking-wider text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form action={handleMagicLink} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@performanceeast.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="touch" className="w-full" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send magic link'}
        </Button>
      </form>

      {status ? (
        <p
          className={
            status.tone === 'error'
              ? 'text-sm text-destructive'
              : status.tone === 'success'
                ? 'text-sm text-emerald-600 dark:text-emerald-400'
                : 'text-sm text-muted-foreground'
          }
          role={status.tone === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
