'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Trash2, Upload, Download } from 'lucide-react';
import { Button, Input, Label } from '@pe/ui';
import {
  importHitList,
  deleteHitListRow,
  clearUnsoldHitList,
  type ActionResult,
  type ImportResult,
} from './actions';

export interface HitListRow {
  id: string;
  stockNumber: string;
  description: string | null;
  dateInStock: string | null;
  spiffAmount: number;
  soldByUserId: string | null;
  soldByName: string | null;
  soldAt: string | null;
  notes: string | null;
}

interface HitListManagerProps {
  storeId: string;
  rows: HitListRow[];
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const TEMPLATE_CSV = [
  'stock_number,description,date_in_stock,spiff_amount,notes',
  '12345,2024 Honda CRF450R,2024-11-15,200,',
  '67890,2023 Yamaha Wolverine RMAX2,2024-09-01,300,Aged 200+ days',
  '',
].join('\r\n');

export function HitListManager({ storeId, rows }: HitListManagerProps) {
  const params = useParams<{ store: string }>();
  const storeSlug = params.store ?? '';

  const [importPending, startImport] = useTransition();
  const [rowPending, startRow] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [rowResult, setRowResult] = useState<ActionResult | null>(null);

  function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startImport(async () => {
      const res = await importHitList(formData);
      setImportResult(res);
      if (res.ok) form.reset();
    });
  }

  function onDelete(row: HitListRow) {
    if (!confirm(`Delete stock ${row.stockNumber}?`)) return;
    setPendingId(row.id);
    const formData = new FormData();
    formData.set('id', row.id);
    formData.set('storeSlug', storeSlug);
    startRow(async () => {
      const res = await deleteHitListRow(formData);
      setRowResult(res);
      setPendingId(null);
    });
  }

  function onClearUnsold() {
    if (!confirm('Remove every unsold row from the hit list? (Sold units are kept.)')) return;
    const formData = new FormData();
    formData.set('storeId', storeId);
    startRow(async () => {
      const res = await clearUnsoldHitList(formData);
      setRowResult(res);
    });
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hit-list-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const unsoldCount = rows.filter((r) => !r.soldByUserId).length;
  const soldCount = rows.length - unsoldCount;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            Current hit list
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {unsoldCount} unsold
              {soldCount > 0 ? ` \u00b7 ${soldCount} sold` : ''}
            </span>
          </h2>
          {unsoldCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearUnsold}
              disabled={rowPending}
            >
              Clear unsold
            </Button>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No hit list items yet. Upload a CSV or XLSX to start.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Stock #</th>
                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                  <th className="px-3 py-2 text-right font-semibold">Age</th>
                  <th className="px-3 py-2 text-right font-semibold">Spiff $</th>
                  <th className="px-3 py-2 text-left font-semibold">Sold</th>
                  <th className="w-12 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const age = daysSince(row.dateInStock);
                  const sold = Boolean(row.soldByUserId);
                  return (
                    <tr
                      key={row.id}
                      className={sold ? 'bg-muted/30 text-muted-foreground' : undefined}
                    >
                      <td className="px-3 py-2 font-mono font-medium">{row.stockNumber}</td>
                      <td className="px-3 py-2">{row.description ?? '\u2014'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {age !== null ? `${age}d` : '\u2014'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.spiffAmount > 0 ? `$${row.spiffAmount}` : '\u2014'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {sold ? (
                          <>
                            <span className="font-medium">{row.soldByName ?? 'Unknown'}</span>
                            {row.soldAt ? (
                              <span className="text-muted-foreground"> \u00b7 {row.soldAt}</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">In stock</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(row)}
                          disabled={rowPending && pendingId === row.id}
                          aria-label="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rowResult?.ok ? (
          <p className="text-sm text-green-600">{rowResult.message}</p>
        ) : rowResult && !rowResult.ok ? (
          <p className="text-sm text-red-600">{rowResult.error}</p>
        ) : null}
      </section>

      <aside className="space-y-3">
        <h2 className="text-sm font-semibold">Import from file</h2>
        <form onSubmit={onImport} className="space-y-3 rounded-lg border bg-card p-4">
          <input type="hidden" name="storeId" value={storeId} />

          <div>
            <Label htmlFor="file" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CSV or XLSX
            </Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-1"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Columns: stock_number (required), description, date_in_stock, spiff_amount, notes.
              Existing stock numbers get updated; sold-by history is kept.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="mr-1 h-4 w-4" />
              Template
            </Button>
            <Button type="submit" disabled={importPending}>
              <Upload className="mr-1 h-4 w-4" />
              {importPending ? 'Importing\u2026' : 'Import'}
            </Button>
          </div>

          {importResult?.ok ? (
            <p className="text-sm text-green-600">{importResult.message}</p>
          ) : importResult && !importResult.ok ? (
            <p className="text-sm text-red-600">{importResult.error}</p>
          ) : null}
        </form>

        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
          Sold-by attribution is set automatically when a salesperson logs a
          deal with a matching stock number \u2014 no manual entry needed here.
        </div>
      </aside>
    </div>
  );
}
