export { cn } from './lib/utils';

// shadcn primitives
export { Badge, badgeVariants } from './components/badge';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/card';
export { Checkbox } from './components/checkbox';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
} from './components/dropdown-menu';
export { Input, type InputProps } from './components/input';
export { Label } from './components/label';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
} from './components/select';
export { Separator } from './components/separator';
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './components/sheet';
export { Textarea, type TextareaProps } from './components/textarea';

// PE-branded wrappers
export {
  DepartmentBadge,
  DEPARTMENTS,
  type Department,
} from './components/department-badge';
export {
  PriorityIndicator,
  toPriority,
  type Priority,
} from './components/priority-indicator';
export { PageHeader, type PageHeaderProps } from './components/page-header';
