/**
 * Owner-email bootstrap. The first login whose email matches `OWNER_EMAIL`
 * gets `role='owner'`; everyone else gets `role='employee'`. This is a
 * stopgap until the portal launches role-based admin.
 */

export type AppRole = 'owner' | 'gm' | 'manager' | 'employee';

export function roleForEmail(email: string | null | undefined): AppRole {
  const owner = process.env.OWNER_EMAIL?.toLowerCase().trim();
  if (!owner) return 'employee';
  return email?.toLowerCase().trim() === owner ? 'owner' : 'employee';
}
