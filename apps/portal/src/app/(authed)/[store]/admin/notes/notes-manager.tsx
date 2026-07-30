'use client';

import { useRef, useState, useTransition } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@pe/ui';
import {
  createNote,
  createTaskFromNote,
  deleteNote,
  type NotesActionResult,
} from './actions';

const DEPARTMENTS = [
  { value: 'sales', label: 'Sales' },
  { value: 'service', label: 'Service' },
  { value: 'parts', label: 'Parts' },
  { value: 'fni', label: 'F&I' },
  { value: 'other', label: 'Other' },
] as const;

const PRIORITIES = [
  { value: '0', label: 'P0 — Critical' },
  { value: '1', label: 'P1 — High' },
  { value: '2', label: 'P2 — Normal' },
  { value: '3', label: 'P3 — Low' },
] as const;

export interface NoteRow {
  id: string;
  date: string;
  text: string | null;
  tasksExtractedCount: number;
  originalPdfUrl: string | null;
}

interface NotesManagerProps {
  storeSlug: string;
  notes: NoteRow[];
  today: string;
}

export function NotesManager({ storeSlug, notes, today }: NotesManagerProps) {
  const noteFormRef = useRef<HTMLFormElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<NotesActionResult | null>(null);
  const [showNewNote, setShowNewNote] = useState(notes.length === 0);

  function saveNote(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await createNote(formData);
      setResult(nextResult);
      if (nextResult.ok) {
        noteFormRef.current?.reset();
        setShowNewNote(false);
      }
    });
  }

  function removeNote(noteId: string) {
    if (!window.confirm('Delete this note? Linked tasks will remain in Today.')) return;
    const formData = new FormData();
    formData.set('storeSlug', storeSlug);
    formData.set('noteId', noteId);
    setResult(null);
    startTransition(async () => setResult(await deleteNote(formData)));
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setShowNewNote((current) => !current)}>
          <Plus className="mr-2 h-4 w-4" />
          {showNewNote ? 'Close note form' : 'New note'}
        </Button>
      </div>

      {showNewNote ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capture a note</CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={noteFormRef} action={saveNote} className="space-y-4">
              <input type="hidden" name="storeSlug" value={storeSlug} />
              <div className="max-w-48">
                <Label htmlFor="noteDate">Date</Label>
                <Input
                  id="noteDate"
                  name="date"
                  type="date"
                  defaultValue={today}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="noteText">Note</Label>
                <Textarea
                  id="noteText"
                  name="text"
                  rows={8}
                  maxLength={20000}
                  className="mt-1"
                  placeholder="Paste a transcription or type the note here."
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Saving…' : 'Save note'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <p
          role="status"
          className={result.ok ? 'text-sm text-green-600' : 'text-sm text-destructive'}
        >
          {result.ok ? result.message : result.error}
        </p>
      ) : null}

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No notes yet. Capture one manually now; iPad sync can be connected later.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              storeSlug={storeSlug}
              pending={pending}
              onResult={setResult}
              startTransition={startTransition}
              onDelete={() => removeNote(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: NoteRow;
  storeSlug: string;
  pending: boolean;
  onResult: (result: NotesActionResult) => void;
  startTransition: React.TransitionStartFunction;
  onDelete: () => void;
}

function NoteCard({
  note,
  storeSlug,
  pending,
  onResult,
  startTransition,
  onDelete,
}: NoteCardProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [department, setDepartment] =
    useState<(typeof DEPARTMENTS)[number]['value']>('other');
  const [priority, setPriority] = useState('2');

  function saveTask(formData: FormData) {
    startTransition(async () => {
      const nextResult = await createTaskFromNote(formData);
      onResult(nextResult);
      if (nextResult.ok) {
        formRef.current?.reset();
        setDepartment('other');
        setPriority('2');
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {new Date(`${note.date}T00:00:00`).toLocaleDateString()}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {note.tasksExtractedCount} task
              {note.tasksExtractedCount === 1 ? '' : 's'} created
            </p>
          </div>
          <div className="flex items-center gap-1">
            {note.originalPdfUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={note.originalPdfUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  PDF
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={pending}
              aria-label="Delete note"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm">
          {note.text ?? '(awaiting transcription)'}
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-medium text-pe-red-500">
            Create a task from this note
          </summary>
          <form ref={formRef} action={saveTask} className="mt-3 space-y-3">
            <input type="hidden" name="storeSlug" value={storeSlug} />
            <input type="hidden" name="noteId" value={note.id} />
            <input type="hidden" name="department" value={department} />
            <input type="hidden" name="priority" value={priority} />

            <div>
              <Label htmlFor={`task-title-${note.id}`}>Task title</Label>
              <Input
                id={`task-title-${note.id}`}
                name="title"
                className="mt-1"
                maxLength={300}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Department</Label>
                <Select
                  value={department}
                  onValueChange={(value) =>
                    setDepartment(value as (typeof DEPARTMENTS)[number]['value'])
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor={`task-due-${note.id}`}>Due date</Label>
                <Input
                  id={`task-due-${note.id}`}
                  name="dueDate"
                  type="date"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? 'Adding…' : 'Add to Today'}
              </Button>
            </div>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
