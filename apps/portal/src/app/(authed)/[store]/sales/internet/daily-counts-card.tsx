'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@pe/ui';
import {
  saveDailyLeadCount,
  deleteDailyLeadCount,
  type ActionResult,
} from './actions';

export interface DailyCountRow {
  id: string;
  countDate: string;
  totalLeads: number;
  notes: string | null;
}

interface Props {
  storeId: string;
  defaultDate: string;
  rows: DailyCountRow[];
}

export function DailyCountsCard({ storeId, defaultDate, rows }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveDailyLeadCount(fd);
      setFeedback(res);
      if (res.ok) setCount('');
    });
  }

  function onDelete(row: DailyCountRow) {
    if (!confirm(`Delete count for ${row.countDate}?`)) return;
    const fd = new FormData();
    fd.set('id', row.id);
    fd.set('storeId', storeId);
    startTransition(async () => {
      const res = await deleteDailyLeadCount(fd);
      setFeedback(res);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily lead counts</CardTitle>
        <CardDescription>
          Roll-up totals when per-lead detail isn&rsquo;t worth logging. Saving
          the same date overwrites the previous count.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <input type="hidden" name="storeId" value={storeId} />
          <div className="grid gap-2 sm:grid-cols-[140px_120px_1fr_auto]">
            <div>
              <Label htmlFor="dlc-date" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Date
              </Label>
              <Input
                id="dlc-date"
                name="countDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label htmlFor="dlc-count" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Leads
              </Label>
              <Input
                id="dlc-count"
                name="totalLeads"
                type="number"
                min={0}
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
                className="mt-1 h-9"
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="dlc-notes" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </Label>
              <Input
                id="dlc-notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 h-9"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending} className="h-9">
                {pending ? 'Saving…' : 'Log'}
              </Button>
            </div>
          </div>
          {feedback ? (
            <p className={feedback.ok ? 'text-xs text-green-600' : 'text-xs text-red-600'}>
              {feedback.ok ? feedback.message : feedback.error}
            </p>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No daily counts logged for this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Date</th>
                  <th className="py-2 text-right font-semibold">Leads</th>
                  <th className="py-2 text-left font-semibold">Notes</th>
                  <th className="py-2 text-right font-semibold w-1">{''}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 tabular-nums">{r.countDate}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {r.totalLeads}
                    </td>
                    <td className="py-2 text-muted-foreground">{r.notes ?? '—'}</td>
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => onDelete(r)}
                        aria-label="Delete count"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
