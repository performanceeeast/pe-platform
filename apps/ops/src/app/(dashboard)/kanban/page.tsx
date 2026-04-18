import type { Metadata } from 'next';
import { PageHeader } from '@pe/ui';

export const metadata: Metadata = { title: 'Kanban' };

// TODO(kanban): drag-and-drop 5-column board (Inbox / Today / This Week /
// Waiting / Done) using @dnd-kit/core, filtered by department in the header.
// On mobile, collapse to a single swipeable column view.
export default function KanbanPage() {
  return (
    <div className="container max-w-6xl py-4 md:py-8">
      <PageHeader
        title="Kanban"
        description="Drag-and-drop board coming next. For now, /today is where the work is."
      />
      <div className="mt-8 rounded-lg border border-dashed bg-muted/20 p-12 text-center text-sm text-muted-foreground">
        Kanban view is scaffolded but not implemented yet.
      </div>
    </div>
  );
}
