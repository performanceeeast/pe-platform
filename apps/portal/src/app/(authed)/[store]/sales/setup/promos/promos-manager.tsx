'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Trash2, Upload } from 'lucide-react';
import { Button, Input, Label, Textarea } from '@pe/ui';
import { uploadPromo, deletePromo, type ActionResult } from './actions';

export interface PromoDoc {
  id: string;
  title: string;
  storagePath: string;
  publicUrl: string;
  effectiveStart: string | null;
  effectiveEnd: string | null;
  notes: string | null;
  isGlobal: boolean;
}

interface PromosManagerProps {
  storeId: string;
  docs: PromoDoc[];
}

export function PromosManager({ storeId, docs }: PromosManagerProps) {
  const params = useParams<{ store: string }>();
  const storeSlug = params.store ?? '';

  const [uploadPending, startUpload] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startUpload(async () => {
      const res = await uploadPromo(formData);
      setResult(res);
      if (res.ok) form.reset();
    });
  }

  function onDelete(doc: PromoDoc) {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    setDeletingId(doc.id);
    const formData = new FormData();
    formData.set('id', doc.id);
    formData.set('storagePath', doc.storagePath);
    formData.set('storeSlug', storeSlug);
    startDelete(async () => {
      const res = await deletePromo(formData);
      setResult(res);
      setDeletingId(null);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Current promos</h2>
        {docs.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No promos uploaded yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start gap-3 rounded-lg border bg-card p-3"
              >
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-medium hover:underline"
                    >
                      {doc.title}
                    </a>
                    {doc.isGlobal ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Global
                      </span>
                    ) : null}
                  </div>
                  {doc.effectiveStart || doc.effectiveEnd ? (
                    <p className="text-xs text-muted-foreground">
                      {doc.effectiveStart ?? 'open'} \u2192 {doc.effectiveEnd ?? 'open'}
                    </p>
                  ) : null}
                  {doc.notes ? (
                    <p className="text-xs text-muted-foreground">{doc.notes}</p>
                  ) : null}
                </div>
                {doc.isGlobal ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(doc)}
                    disabled={deletePending && deletingId === doc.id}
                    aria-label="Delete promo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="space-y-3">
        <h2 className="text-sm font-semibold">Upload a promo</h2>
        <form onSubmit={onUpload} className="space-y-3 rounded-lg border bg-card p-4">
          <input type="hidden" name="storeId" value={storeId} />

          <div>
            <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="April Honda Rebates"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="file" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              File (PDF or image)
            </Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="mt-1"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Max 20 MB.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="effectiveStart" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start
              </Label>
              <Input
                id="effectiveStart"
                name="effectiveStart"
                type="date"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="effectiveEnd" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                End
              </Label>
              <Input
                id="effectiveEnd"
                name="effectiveEnd"
                type="date"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              className="mt-1"
              rows={2}
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0 text-sm">
              {result?.ok ? (
                <span className="text-green-600">{result.message}</span>
              ) : result && !result.ok ? (
                <span className="text-red-600">{result.error}</span>
              ) : null}
            </div>
            <Button type="submit" disabled={uploadPending}>
              <Upload className="mr-1 h-4 w-4" />
              {uploadPending ? 'Uploading\u2026' : 'Upload'}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
