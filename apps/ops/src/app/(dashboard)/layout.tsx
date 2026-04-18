import { redirect } from 'next/navigation';
import { requireUser } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { SidebarNav } from '@/components/sidebar-nav';
import { BottomNav } from '@/components/bottom-nav';
import { UserMenu } from '@/components/user-menu';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const supabase = createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single();

  // If profile row is missing the callback must have failed; bounce back to login.
  if (!profile) redirect('/login?error=no_profile');

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <UserMenu
            email={profile.email ?? user.email ?? null}
            fullName={profile.full_name}
            role={profile.role}
          />
        </header>
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
