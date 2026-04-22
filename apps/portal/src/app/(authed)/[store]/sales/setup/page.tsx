import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Target,
  DollarSign,
  Package,
  Trophy,
  Clock,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@pe/ui';
import { requireUserContext } from '@pe/auth';

export const metadata: Metadata = { title: 'Sales setup' };

interface SetupSection {
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
  status: 'ready' | 'stub';
}

const SECTIONS: SetupSection[] = [
  {
    slug: 'goals',
    label: 'Monthly goals',
    description: 'Unit-type targets, stretch goals, and per-unit payouts.',
    icon: Target,
    status: 'ready',
  },
  {
    slug: 'pga',
    label: 'PG&A tiers',
    description: 'Tiered spiff amounts by PG&A dollars per deal.',
    icon: DollarSign,
    status: 'ready',
  },
  {
    slug: 'spiffs',
    label: 'Back-end spiffs',
    description: 'Spiff per F&I product plus the all-products bonus.',
    icon: Package,
    status: 'ready',
  },
  {
    slug: 'contests',
    label: 'Contests',
    description: 'Monthly contest setup and winner tracking.',
    icon: Trophy,
    status: 'ready',
  },
  {
    slug: 'hit-list',
    label: 'Hit list',
    description: 'Aged inventory over 120 days with sold-by tracking.',
    icon: Clock,
    status: 'stub',
  },
  {
    slug: 'promos',
    label: 'Promo hub',
    description: 'Upload monthly rebate and financing PDFs.',
    icon: FileText,
    status: 'stub',
  },
];

interface SetupHubProps {
  params: { store: string };
}

export default async function SetupHubPage({ params }: SetupHubProps) {
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  const storeName = store?.name ?? params.store;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sales setup · ${storeName}`}
        description="Configure the monthly plan your sales team will work against."
      />

      <div className="grid gap-4 px-4 md:px-6 lg:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const href = `/${params.store}/sales/setup/${section.slug}`;
          return (
            <Link key={section.slug} href={href} className="group block">
              <Card className="h-full transition-colors group-hover:border-pe-red-500">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-pe-red-500" />
                    <CardTitle className="text-lg">{section.label}</CardTitle>
                    {section.status === 'stub' ? (
                      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Soon
                      </span>
                    ) : null}
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {section.status === 'ready'
                    ? 'Open \u2192'
                    : 'Coming next'}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
