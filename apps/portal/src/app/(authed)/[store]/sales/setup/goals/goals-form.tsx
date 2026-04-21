'use client';

import { useState, useTransition } from 'react';
import { Button, Input } from '@pe/ui';
import { saveGoals, type ActionResult } from './actions';

export interface UnitTypeOption {
  id: string;
  label: string;
}

export interface GoalRow {
  unitTypeId: string;
  label: string;
  target: number;
  stretch: number;
  payout: number;
  stretchPayout: number;
  goalId: string | null;
}

interface GoalsFormProps {
  storeId: string;
  year: number;
  month: number;
  rows: GoalRow[];
  unitTypes: UnitTypeOption[];
}

export function GoalsForm({ storeId, year, month, rows }: GoalsFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [values, setValues] = useState(rows);

  function update(idx: number, field: keyof GoalRow, value: string) {
    setValues((prev) =>
      prev.map((row, i) =>
        i === idx
          ? { ...row, [field]: value === '' ? 0 : Number(value) }
          : row,
      ),
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveGoals(formData);
      setResult(res);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
        No unit types configured for this store. Add unit types first in store
        settings.
      </div>
    );
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
              <th className="px-3 py-2 text-left font-semibold">Unit type</th>
              <th className="px-3 py-2 text-right font-semibold">Target</th>
              <th className="px-3 py-2 text-right font-semibold">Stretch</th>
              <th className="px-3 py-2 text-right font-semibold">Payout $</th>
              <th className="px-3 py-2 text-right font-semibold">Stretch payout $</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {values.map((row, idx) => (
              <tr key={row.unitTypeId}>
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2">
                  <input
                    type="hidden"
                    name={`row[${idx}].unitTypeId`}
                    value={row.unitTypeId}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].target`}
                    value={row.target}
                    onChange={(e) => update(idx, 'target', e.target.value)}
                    className="ml-auto h-8 w-24 text-right"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].stretch`}
                    value={row.stretch}
                    onChange={(e) => update(idx, 'stretch', e.target.value)}
                    className="ml-auto h-8 w-24 text-right"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].payout`}
                    value={row.payout}
                    onChange={(e) => update(idx, 'payout', e.target.value)}
                    className="ml-auto h-8 w-28 text-right"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].stretchPayout`}
                    value={row.stretchPayout}
                    onChange={(e) => update(idx, 'stretchPayout', e.target.value)}
                    className="ml-auto h-8 w-28 text-right"
                    inputMode="numeric"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          {result?.ok ? (
            <span className="text-green-600">{result.message}</span>
          ) : result && !result.ok ? (
            <span className="text-red-600">{result.error}</span>
          ) : null}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving\u2026' : 'Save goals'}
        </Button>
      </div>
    </form>
  );
}
