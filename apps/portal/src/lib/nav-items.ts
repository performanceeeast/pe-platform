import { Home, BookOpen, Target, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Primary nav items. The "Home" entry is built dynamically from the user's
 * current store + department, so it's not listed here.
 */
export const GLOBAL_NAV: NavItem[] = [
  { href: '/resources', label: 'Resources', icon: BookOpen },
  { href: '/targets', label: 'Targets', icon: Target },
];

export const HOME_ICON: LucideIcon = Home;
