import type { UserContext } from './context';

/**
 * Post-login destination for the portal. Everyone lands on their own
 * department's home inside their primary store. Role-specific content
 * (manager extras, etc.) is branched inside the department page itself,
 * not via distinct routes.
 */
export function getLandingPath(ctx: UserContext): string {
  if (!ctx.role) return '/onboarding';
  const storeSlug = ctx.primaryStore?.slug;
  if (!storeSlug) return '/no-access';
  return `/${storeSlug}/${ctx.role.department}`;
}
