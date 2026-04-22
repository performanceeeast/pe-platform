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
import { saveContests, type ActionResult } from './actions';

export interface SalespersonOption {
  id: string;
  label: string;
}

export interface ContestRow {
  id: string | null;
  name: string;
  description: string;
  prize: string;
  winnerUserId: string | null;
}

interface ContestsFormProps {
  storeId: string;
  year: number;
  month: number;
  rows: ContestRow[];
  salespeople: SalespersonOption[];
}

const NO_WINNER_VALUE = '__none__';

function emptyContest(): ContestRow {
  return { id: null, name: '', description: '', prize: '', winnerUserId: null };
}

export function ContestsForm({
  storeId,
  year,
  month,
  rows,
  salespeople,
}: ContestsFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [values, setValues] = useState<ContestRow[]>(rows);

  function update<K extends keyof ContestRow>(idx: number, field: K, value: ContestRow[K]) {
    setValues((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  function addContest() {
    setValues((prev) => [...prev, emptyContest()]);
  }

  function removeContest(idx: number) {
    setValues((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveContests(formData);
      setResult(res);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />

      {values.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No contests for this month yet. Add one below.
        </div>
      ) : (
        <div className="space-y-4">
          {values.map((row, idx) => (
            <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Label htmlFor={`name-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contest name
                  </Label>
                  <Input
                    id={`name-${idx}`}
                    name={`row[${idx}].name`}
                    value={row.name}
                    onChange={(e) => update(idx, 'name', e.target.value)}
                    placeholder="e.g. April SXS Push"
                    className="mt-1"
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContest(idx)}
                  aria-label="Delete contest"
                  className="mt-5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label htmlFor={`description-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id={`description-${idx}`}
                  name={`row[${idx}].description`}
                  value={row.description}
                  onChange={(e) => update(idx, 'description', e.target.value)}
                  placeholder="Rules, qualifying units, tiebreakers\u2026"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`prize-${idx}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Prize
                  </Label>
                  <Input
                    id={`prize-${idx}`}
                    name={`row[${idx}].prize`}
                    value={row.prize}
                    onChange={(e) => update(idx, 'prize', e.target.value)}
                    placeholder="e.g. $500 gift card"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Winner
                  </Label>
                  <input
                    type="hidden"
                    name={`row[${idx}].winnerUserId`}
                    value={row.winnerUserId ?? ''}
                  />
                  <Select
                    value={row.winnerUserId ?? NO_WINNER_VALUE}
                    onValueChange={(v) =>
                      update(idx, 'winnerUserId', v === NO_WINNER_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Not yet decided" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_WINNER_VALUE}>Not yet decided</SelectItem>
                      {salespeople.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addContest}>
        <Plus className="mr-1 h-4 w-4" />
        Add contest
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
          {pending ? 'Saving\u2026' : 'Save contests'}
        </Button>
      </div>
    </form>
  );
}
