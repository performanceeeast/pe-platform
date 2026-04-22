'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Label } from '@pe/ui';
import { saveSpiffs, type ActionResult } from './actions';

export interface SpiffRow {
  fniProductId: string;
  label: string;
  amount: number;
}

interface SpiffsFormProps {
  storeId: string;
  year: number;
  month: number;
  rows: SpiffRow[];
  allProductsBonus: number;
}

export function SpiffsForm({
  storeId,
  year,
  month,
  rows,
  allProductsBonus,
}: SpiffsFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [values, setValues] = useState(rows);
  const [bonus, setBonus] = useState(allProductsBonus);

  function update(idx: number, value: string) {
    setValues((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, amount: value === '' ? 0 : Number(value) } : row,
      ),
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSpiffs(formData);
      setResult(res);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
        No F&I products configured for this store yet.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Product</th>
              <th className="px-3 py-2 text-right font-semibold">Spiff amount $</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {values.map((row, idx) => (
              <tr key={row.fniProductId}>
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2">
                  <input
                    type="hidden"
                    name={`row[${idx}].fniProductId`}
                    value={row.fniProductId}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    name={`row[${idx}].amount`}
                    value={row.amount}
                    onChange={(e) => update(idx, e.target.value)}
                    className="ml-auto h-8 w-28 text-right"
                    inputMode="numeric"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="allProductsBonus" className="text-sm">
          All products bonus $
        </Label>
        <Input
          id="allProductsBonus"
          name="allProductsBonus"
          type="number"
          min={0}
          step="1"
          value={bonus}
          onChange={(e) => setBonus(e.target.value === '' ? 0 : Number(e.target.value))}
          className="h-8 w-28 text-right"
          inputMode="numeric"
        />
        <span className="text-xs text-muted-foreground">
          Extra spiff when all products land on one deal.
        </span>
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
          {pending ? 'Saving\u2026' : 'Save spiffs'}
        </Button>
      </div>
    </form>
  );
}
