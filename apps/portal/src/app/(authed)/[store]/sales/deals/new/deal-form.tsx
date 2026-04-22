'use client';

import { useState, useTransition } from 'react';
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
import { saveDeal, type SaveDealResult } from './actions';

export interface UnitTypeOption {
  id: string;
  label: string;
}

export interface SalespersonOption {
  id: string;
  label: string;
}

interface DealFormProps {
  storeId: string;
  storeSlug: string;
  unitTypes: UnitTypeOption[];
  salespeople: SalespersonOption[];
  defaultSalespersonId: string | null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DealForm({
  storeId,
  storeSlug,
  unitTypes,
  salespeople,
  defaultSalespersonId,
}: DealFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveDealResult | null>(null);
  const [salespersonId, setSalespersonId] = useState<string>(
    defaultSalespersonId ?? '',
  );
  const [unitTypeId, setUnitTypeId] = useState<string>('');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await saveDeal(formData);
      setResult(res);
      if (res.ok) {
        form.reset();
        setSalespersonId(defaultSalespersonId ?? '');
        setUnitTypeId('');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="salespersonUserId" value={salespersonId} />
      <input type="hidden" name="unitTypeId" value={unitTypeId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="dealDate">Date</Label>
          <Input
            id="dealDate"
            name="dealDate"
            type="date"
            defaultValue={todayISO()}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="dealNumber">Deal #</Label>
          <Input
            id="dealNumber"
            name="dealNumber"
            placeholder="optional"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="customerName">Customer</Label>
        <Input
          id="customerName"
          name="customerName"
          className="mt-1"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Salesperson</Label>
          <Select value={salespersonId} onValueChange={setSalespersonId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              {salespeople.map((sp) => (
                <SelectItem key={sp.id} value={sp.id}>
                  {sp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Unit type</Label>
          <Select value={unitTypeId} onValueChange={setUnitTypeId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              {unitTypes.map((ut) => (
                <SelectItem key={ut.id} value={ut.id}>
                  {ut.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="stockNumber">Stock #</Label>
          <Input
            id="stockNumber"
            name="stockNumber"
            placeholder="optional"
            className="mt-1 font-mono"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Matches hit list for auto-spiff.
          </p>
        </div>
        <div>
          <Label htmlFor="unitCount">Unit count</Label>
          <Input
            id="unitCount"
            name="unitCount"
            type="number"
            min={1}
            defaultValue={1}
            className="mt-1 text-right"
            inputMode="numeric"
          />
        </div>
        <div>
          <Label htmlFor="pgaTotal">PG&A total $</Label>
          <Input
            id="pgaTotal"
            name="pgaTotal"
            type="number"
            min={0}
            step="1"
            placeholder="0"
            className="mt-1 text-right"
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          className="mt-1"
          rows={2}
          placeholder="Optional"
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="min-w-0 text-sm">
          {result?.ok ? (
            <div className="space-y-1">
              <p className="font-medium text-green-600">{result.message}</p>
              {result.hitListMatch ? (
                <p className="text-xs text-muted-foreground">
                  Matched stock {result.hitListMatch.stockNumber}
                  {result.hitListMatch.unitLabel
                    ? ` \u00b7 ${result.hitListMatch.unitLabel}`
                    : ''}
                </p>
              ) : null}
            </div>
          ) : result && !result.ok ? (
            <span className="text-red-600">{result.error}</span>
          ) : (
            <span className="text-muted-foreground">
              Finance completes back-end after save.
            </span>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving\u2026' : 'Log deal'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        After save the deal appears on the <a
          href={`/${storeSlug}/sales`}
          className="underline underline-offset-2"
        >
          sales dashboard
        </a>.
      </p>
    </form>
  );
}
