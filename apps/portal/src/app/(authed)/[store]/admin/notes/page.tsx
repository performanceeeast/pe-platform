import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@pe/ui';
import { getLandingPath, requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { NotesManager, type NoteRow } from './notes-manager';

export const metadata: Metadata = { title: 'Notes' };

interface NotesPageProps {
  params: { store: string };
}

export default async function NotesPage({ params }: NotesPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((candidate) => candidate.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const supabase = createClient();
  const { data: notes } = await supabase
    .from('notes')
    .select('id, date, transcribed_text, tasks_extracted_count, original_pdf_url')
    .order('date', { ascending: false });

  const rows: NoteRow[] = (notes ?? []).map((note) => ({
    id: note.id,
    date: note.date,
    text: note.transcribed_text,
    tasksExtractedCount: note.tasks_extracted_count,
    originalPdfUrl: note.original_pdf_url,
  }));

  return (
    <div className="container max-w-4xl py-4 md:py-8">
      <PageHeader
        title="Notes"
        description="Capture notes manually and turn action items into Today tasks. iPad sync is not connected yet."
      />
      <div className="mt-6">
        <NotesManager
          storeSlug={store.slug}
          notes={rows}
          today={new Date().toISOString().slice(0, 10)}
        />
      </div>
    </div>
  );
}
