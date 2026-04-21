import {
  Home,
  BookOpen,
  Target,
  Users,
  LayoutGrid,
  Folder,
  FileText,
  Settings,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Evergreen links shown to everyone. */
export const GLOBAL_NAV: NavItem[] = [
  { href: '/resources', label: 'Resources', icon: BookOpen },
  { href: '/targets', label: 'Targets', icon: Target },
];

/** Admin-only top-level links that live outside /[store]/... */
export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/users', label: 'Users', icon: Users },
];

/**
 * Admin sub-nav under /[store]/admin. Links are resolved with the current
 * store slug at render time, so they always target the active store.
 */
export const ADMIN_STORE_NAV: Array<{ sub: string; label: string; icon: LucideIcon }> = [
  { sub: '', label: 'Today', icon: Home },
  { sub: '/kanban', label: 'Kanban', icon: LayoutGrid },
  { sub: '/projects', label: 'Projects', icon: Folder },
  { sub: '/notes', label: 'Notes', icon: FileText },
  { sub: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Department links resolved against the active store slug at render time.
 * Shown to admins as a "Departments" section in the sidebar. Non-admins
 * already have their own department via the Home link, so we don't repeat it.
 */
export const DEPT_STORE_NAV: Array<{ sub: string; label: string; icon: LucideIcon }> = [
  { sub: '/sales', label: 'Sales', icon: TrendingUp },
];

export const HOME_ICON: LucideIcon = Home;
