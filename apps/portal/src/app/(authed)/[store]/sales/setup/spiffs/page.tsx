import Link from 'next/link';
import type { Metadata } from 'next';
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '@pe/ui';

export const metadata: Metadata = { title: 'Back-end spiffs' };

interface Props {
  params: { store: string };
}

export default function SpiffsSetupPage({ params }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Back-end spiffs"
        description="Spiff amounts per F&I product plus the all-products bonus."
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
