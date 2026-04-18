import {
  Home,
  LayoutGrid,
  Users,
  Folder,
  FileText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: '/today', label: 'Today', icon: Home },
  { href: '/kanban', label: 'Kanban', icon: LayoutGrid },
  { href: '/department/sales', label: 'Departments', icon: Users },
  { href: '/projects', label: 'Projects', icon: Folder },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const MOBILE_NAV: NavItem[] = PRIMARY_NAV.filter((item) =>
  ['/today', '/kanban', '/projects', '/settings'].includes(item.href),
);
