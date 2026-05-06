import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@pe/ui';

export const metadata: Metadata = { title: 'Resources' };

interface ResourceLink {
  label: string;
  href: string;
}

interface ResourceCard {
  label: string;
  description: string;
  links: ResourceLink[];
  emptyMessage?: string;
}

const RESOURCES: ResourceCard[] = [
  {
    label: 'Employee Handbook',
    description: 'Policies, benefits overview, paid time off.',
    links: [
      {
        label: 'Open the handbook',
        href: 'https://drive.google.com/file/d/1fqVrwCT5zCvodaGx2bpr_yivVEnULxMk/view?usp=drive_link',
      },
    ],
  },
  {
    label: 'Paychex Flex',
    description: 'Paystubs, W-2s, direct deposit, benefits enrollment.',
    links: [{ label: 'Sign in to Paychex Flex', href: 'https://myapps.paychex.com' }],
  },
  {
    label: 'Links',
    description: 'OEM websites, vendor portals, and other day-to-day resources.',
    links: [],
    emptyMessage: 'No links added yet — Matthew is collecting OEM and vendor URLs.',
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Handbook, payroll, and the evergreen links you reach for most."
      />
      <div className="grid gap-3 px-4 pb-8 md:px-6 md:grid-cols-2">
        {RESOURCES.map((r) => (
          <ResourceCardView key={r.label} card={r} />
        ))}
      </div>
    </div>
  );
}

function ResourceCardView({ card }: { card: ResourceCard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{card.label}</CardTitle>
        <CardDescription>{card.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {card.links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {card.emptyMessage ?? 'No links yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {card.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-pe-red-500 hover:underline"
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
