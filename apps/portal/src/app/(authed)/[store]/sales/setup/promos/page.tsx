import Link from 'next/link';
import type { Metadata } from 'next';
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '@pe/ui';

export const metadata: Metadata = { title: 'Promo hub' };

interface Props {
  params: { store: string };
}

export default function PromosSetupPage({ params }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Promo hub"
        description="Upload monthly rebate and financing PDFs."
        actions={
          <Button asChild variant="outline">
            <Link href={`/${params.store}/sales/setup`}>Back to setup</Link>
          </Button>
        }
      />
      <div className="px-4 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Coming next</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Schema is live; UI lands after Goals is validated.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
