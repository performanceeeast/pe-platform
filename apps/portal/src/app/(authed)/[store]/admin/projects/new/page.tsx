import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { getLandingPath, requireUserContext } from '@pe/auth';
import { ProjectForm } from './project-form';

export const metadata: Metadata = { title: 'New project' };

interface NewProjectPageProps {
  params: { store: string };
}

export default async function NewProjectPage({ params }: NewProjectPageProps) {
  const ctx = await requireUserContext();
  const store = ctx.stores.find((candidate) => candidate.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  return (
    <div className="container max-w-5xl py-4 md:py-8">
      <PageHeader
        title="New project"
        description={`Create a project workspace for ${store.name}.`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/${store.slug}/admin/projects`}>Cancel</Link>
          </Button>
        }
      />

      <div className="mt-6">
        <ProjectForm storeSlug={store.slug} />
      </div>
    </div>
  );
}
