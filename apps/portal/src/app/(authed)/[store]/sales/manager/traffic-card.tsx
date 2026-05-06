'use client';

import { useState, useTransition } from 'react';
import { Radio, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pe/ui';
import { saveTraffic, deleteTraffic, type ActionResult } from './actions';

const NONE = '__none__';

export interface SalespersonOption {
  id: string;
  label: string;
}
export interface LeadSourceOption {
  id: string;
  label: string;
}

export interface TrafficRow {
  id: string;
  trafficDate: string;
  customerName: string | null;
  salespersonName: string | null;
  sourceLabel: string | null;
  notes: string | null;
}

export interface SourceSummaryRow {
  id: string;
  label: string;
  count: number;
}

interface Props {
  storeId: string;
  defaultDate: string;
  summary: SourceSummaryRow[];
  totalTraffic: number;
  recent: TrafficRow[];
  salespeople: SalespersonOption[];
  leadSources: LeadSourceOption[];
}

export function TrafficCard({
  storeId,
  defaultDate,
  summary,
  totalTraffic,
  recent,
  salespeople,
  leadSources,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [customer, setCustomer] = useState('');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [salespersonId, setSalespersonId] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveTraffic(fd);
      setFeedback(res);
      if (res.ok) setCustomer('');
    });
  }

  function onDelete(row: TrafficRow) {
    if (!confirm(`Delete traffic entry from ${row.trafficDate}?`)) return;
    const fd = new FormData();
    fd.set('id', row.id);
    fd.set('storeId', storeId);
    startTransition(async () => {
      const res = await deleteTraffic(fd);
      setFeedback(res);
    });
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Traffic by source</CardTitle>
        </div>
        <CardDescription>
          Walk-ins and phone calls. Log inline below — internet leads stay on
          the ISM dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="leadSourceId" value={sourceId ?? ''} />
          <input type="hidden" name="salespersonUserId" value={salespersonId ?? ''} />
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_1fr]">
            <div>
              <Label htmlFor="t-date" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Date
              </Label>
              <Input
                id="t-date"
                name="trafficDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label htmlFor="t-customer" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Customer (optional)
              </Label>
              <Input
                id="t-customer"
                name="customerName"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="mt-1 h-9"
                placeholder="Walk-in, phone caller…"
              />
            </div>
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Source
              </Label>
              <Select
                value={sourceId ?? NONE}
                onValueChange={(v) => setSourceId(v === NONE ? null : v)}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Unspecified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unspecified</SelectItem>
                  {leadSources.map((ls) => (
                    <SelectItem key={ls.id} value={ls.id}>
                      {ls.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Salesperson (optional)
              </Label>
              <Select
                value={salespersonId ?? NONE}
                onValueChange={(v) => setSalespersonId(v === NONE ? null : v)}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {salespeople.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending} className="h-9">
                {pending ? 'Saving…' : 'Log traffic'}
              </Button>
            </div>
          </div>
          {feedback ? (
            <p className={feedback.ok ? 'text-xs text-green-600' : 'text-xs text-red-600'}>
              {feedback.ok ? feedback.message : feedback.error}
            </p>
          ) : null}
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Source breakdown
            </p>
            {summary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No traffic logged this month.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 text-left font-semibold">Source</th>
                    <th className="py-2 text-right font-semibold">Count</th>
                    <th className="py-2 text-right font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summary.map((r) => {
                    const pct = totalTraffic > 0 ? Math.round((r.count / totalTraffic) * 100) : 0;
                    return (
                      <tr key={r.id}>
                        <td className="py-2 font-medium">{r.label}</td>
                        <td className="py-2 text-right tabular-nums">{r.count}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <td className="py-2 font-semibold">Total</td>
                    <td className="py-2 text-right tabular-nums">{totalTraffic}</td>
                    <td className="py-2 text-right tabular-nums">{''}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent entries
            </p>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent entries.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                      {r.trafficDate}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{r.customerName ?? '—'}</span>
                      {r.sourceLabel ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.sourceLabel}
                        </span>
                      ) : null}
                      {r.salespersonName ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {r.salespersonName}
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => onDelete(r)}
                      aria-label="Delete traffic entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
