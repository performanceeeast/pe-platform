import type { Metadata } from 'next';
import { PageHeader } from '@pe/ui';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

export const metadata: Metadata = { title: 'Notes' };

// TODO(notes-pipeline): iPad PDF upload → transcription → task extraction.
// For now this is a read-only archive view of whatever's in the notes table.
export default async function NotesPage() {
  await requireUserContext();
  const supabase = createClient();
  const { data: notes } = await supabase
    .from('notes')
    .select('id, date, transcribed_text, tasks_extracted_count, original_pdf_url')
    .order('date', { ascending: false });

  return (
    <div className="container max-w-4xl py-4 md:py-8">
      <PageHeader
        title="Notes"
        description="Handwritten notes archive, synced from the iPad."
      />
      {!notes || notes.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed bg-muted/20 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No notes yet. Set up the iPad pipeline to start capturing handwritten notes.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-lg border bg-card">
          {notes.map((n) => (
            <li key={n.id} className="space-y-1 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(n.date).toLocaleDateString()}</span>
                <span>{n.tasks_extracted_count} tasks extracted</span>
              </div>
              <p className="line-clamp-3 text-sm">
                {n.transcribed_text ?? '(awaiting transcription)'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
