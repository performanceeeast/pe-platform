'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@pe/ui';
import { saveHitList, type ActionResult } from './actions';

export interface SalespersonOption {
  id: string;
  label: string;
}

export interface HitListRow {
  id: string | null;
  stockNumber: string;
  description: string;
  dateInStock: string;
  spiffAmount: number;
  soldByUserId: string | null;
  soldAt: string;
  notes: string;
}

const UNSOLD_VALUE = '__unsold__';

function emptyRow(): HitListRow {
  return {
    id: null,
    stockNumber: '',
    description: '',
    dateInStock: '',
    spiffAmount: 0,
    soldByUserId: null,
    soldAt: '',
    notes: '',
  };
}

function daysSince(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

interface HitListFormProps {
  storeId: string;
  rows: HitListRow[];
  salespeople: SalespersonOption[];
}

export function HitListForm({ storeId, rows, salespeople }: HitListFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [values, setValues] = useState<HitListRow[]>(rows);

  function update<K extends keyof HitListRow>(idx: number, field: K, value: HitListRow[K]) {
    setValues((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setValues((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setValues((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveHitList(formData);
      setResult(res);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />

      {values.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No aged inventory tracked yet. Add the first unit below.
        </div>
      ) : (
        <div className="space-y-3">
          {values.map((row, idx) => {
            const age = daysSince(row.dateInStock);
            return (
              <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                <input
                  type="hidden"
                  name={`row[${idx}].id`}
                  value={row.id ?? ''}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label htmlFor={`stock-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Stock #
                      </Label>
                      <Input
                        id={`stock-${idx}`}
                        name={`row[${idx}].stockNumber`}
                        value={row.stockNumber}
                        onChange={(e) => update(idx, 'stockNumber', e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor={`desc-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Description
                      </Label>
                      <Input
                        id={`desc-${idx}`}
                        name={`row[${idx}].description`}
                        value={row.description}
                        onChange={(e) => update(idx, 'description', e.target.value)}
                        placeholder="2024 Can-Am Maverick\u2026"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`spiff-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Spiff $
                      </Label>
                      <Input
                        id={`spiff-${idx}`}
                        name={`row[${idx}].spiffAmount`}
                        type="number"
                        min={0}
                        step="1"
                        value={row.spiffAmount}
                        onChange={(e) =>
                          update(idx, 'spiffAmount', e.target.value === '' ? 0 : Number(e.target.value))
                        }
                        className="mt-1 text-right"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(idx)}
                    aria-label="Delete item"
                    className="mt-5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor={`datein-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date in stock
                    </Label>
                    <Input
                      id={`datein-${idx}`}
                      name={`row[${idx}].dateInStock`}
                      type="date"
                      value={row.dateInStock}
                      onChange={(e) => update(idx, 'dateInStock', e.target.value)}
                      className="mt-1"
                    />
                    {age !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {age} days old
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sold by
                    </Label>
                    <input
                      type="hidden"
                      name={`row[${idx}].soldByUserId`}
                      value={row.soldByUserId ?? ''}
                    />
                    <Select
                      value={row.soldByUserId ?? UNSOLD_VALUE}
                      onValueChange={(v) =>
                        update(idx, 'soldByUserId', v === UNSOLD_VALUE ? null : v)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Still in stock" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNSOLD_VALUE}>Still in stock</SelectItem>
                        {salespeople.map((sp) => (
                          <SelectItem key={sp.id} value={sp.id}>
                            {sp.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`soldat-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sold on
                    </Label>
                    <Input
                      id={`soldat-${idx}`}
                      name={`row[${idx}].soldAt`}
                      type="date"
                      value={row.soldAt}
                      onChange={(e) => update(idx, 'soldAt', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`notes-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </Label>
                  <Textarea
                    id={`notes-${idx}`}
                    name={`row[${idx}].notes`}
                    value={row.notes}
                    onChange={(e) => update(idx, 'notes', e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        Add unit
      </Button>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="text-sm">
          {result?.ok ? (
            <span className="text-green-600">{result.message}</span>
          ) : result && !result.ok ? (
            <span className="text-red-600">{result.error}</span>
          ) : null}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving\u2026' : 'Save hit list'}
        </Button>
      </div>
    </form>
  );
}
