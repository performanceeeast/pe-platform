import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@pe/database/server';
import { roleForEmail } from '@pe/auth';

/**
 * OAuth + magic-link callback. Exchanges the code for a session, then ensures
 * the user has a user_profiles row. First login from OWNER_EMAIL gets
 * role='owner'; everyone else gets role='employee'.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/today';
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  const user = data.user;
  if (user) {
    const role = roleForEmail(user.email);
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null;

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
          role,
        },
        { onConflict: 'id', ignoreDuplicates: false },
      );

    if (upsertError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(upsertError.message)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
