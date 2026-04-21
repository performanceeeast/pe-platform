import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@pe/database/server';
import { roleForEmail } from '@pe/auth';

/**
 * OAuth + magic-link callback for the portal. Mirrors the ops callback:
 * first login creates the user_profiles row with an owner/employee default;
 * subsequent logins only refresh email/full_name so admin-assigned role and
 * store access survive.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
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
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null;

    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ email: user.email ?? null, full_name: fullName })
        .eq('id', user.id);
      if (updateError) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(updateError.message)}`,
        );
      }
    } else {
      const role = roleForEmail(user.email);
      const { error: insertError } = await supabase.from('user_profiles').insert({
        id: user.id,
        email: user.email ?? null,
        full_name: fullName,
        role,
      });
      if (insertError) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(insertError.message)}`,
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
