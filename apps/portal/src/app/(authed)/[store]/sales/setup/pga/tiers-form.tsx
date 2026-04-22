'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@pe/ui';
import { saveTiers, type ActionResult } from './actions';

export interface TierRow {
  id: string | null;
  minAmount: number;
  maxAmount: number;
  spiffAmount: number;
}

interface TiersFormProps {
  storeId: string;
  year: number;
  month: number;
  rows: TierRow[];
}

function emptyRow(): TierRow {
  return { id: null, minAmount: 0, maxAmount: 0, spiffAmount: 0 };
}

export function TiersForm({ storeId, year, month, rows }: TiersFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [values, setValues] = useState<TierRow[]>(
    rows.length > 0 ? rows : [emptyRow()],
  );

  function update(idx: number, field: keyof TierRow, value: string) {
    setValues((prev) =>
      prev.map((row, i) =>
        i === idx
          ? { ...row, [field]: value === '' ? 0 : Number(value) }
          : row,
      ),
    );
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
      const res = await saveTiers(formData);
      setResult(res);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">Min $</th>
              <th className="px-3 py-2 text-right font-semibold">Max $</th>
              <th className="px-3 py-2 text-right font-semibold">Spiff $</th>
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {values.map((row, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].minAmount`}
                    value={row.minAmount}
                    onChange={(e) => update(idx, 'minAmount', e.target.value)}
                    className="ml-auto h-8 w-32 text-right"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].maxAmount`}
                    value={row.maxAmount}
                    onChange={(e) => update(idx, 'maxAmount', e.target.value)}
                    className="ml-auto h-8 w-32 text-right"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].spiffAmount`}
                    value={row.spiffAmount}
                    onChange={(e) => update(idx, 'spiffAmount', e.target.value)}
                    className="ml-auto h-8 w-28 text-right"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(idx)}
                    aria-label="Delete tier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {values.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tiers configured. Add one below.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        Add tier
      </Button>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          {result?.ok ? (
            <span className="text-green-600">{result.message}</span>
          ) : result && !result.ok ? (
            <span className="text-red-600">{result.error}</span>
          ) : null}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving\u2026' : 'Save tiers'}
        </Button>
      </div>
    </form>
  );
}
