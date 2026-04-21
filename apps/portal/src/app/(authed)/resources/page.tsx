import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@pe/ui';
import { ExternalLink } from 'lucide-react';

export const metadata: Metadata = { title: 'Resources' };

const RESOURCES = [
  {
    label: 'Employee Handbook',
    description: 'Policies, benefits overview, paid time off.',
    href: '#',
  },
  {
    label: 'Benefits Portal',
    description: 'Health, dental, vision, 401(k) enrollment.',
    href: '#',
  },
  {
    label: 'Payroll',
    description: 'Paystubs, W-2s, direct deposit.',
    href: '#',
  },
  {
    label: 'Training',
    description: 'OEM product training and certifications.',
    href: '#',
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Handbook, benefits, payroll, and training — one place for the evergreen links."
      />
      <div className="grid gap-3 px-4 pb-8 md:px-6 md:grid-cols-2">
        {RESOURCES.map((r) => (
          <Card key={r.label}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{r.label}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-pe-red-500 hover:underline"
              >
                Open (placeholder link)
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
