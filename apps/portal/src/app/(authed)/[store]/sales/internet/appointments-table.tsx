'use client';

import { useState, useTransition } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  cn,
} from '@pe/ui';
import {
  saveAppointment,
  setAppointmentOutcome,
  deleteAppointment,
  type ActionResult,
} from './actions';

const NONE = '__none__';

export interface SalespersonOption {
  id: string;
  label: string;
}

export interface LeadSourceOption {
  id: string;
  label: string;
}

export interface AppointmentRow {
  id: string;
  apptDate: string;
  customerName: string;
  unitInterested: string | null;
  kept: boolean;
  sold: boolean;
  salespersonUserId: string | null;
  salespersonName: string | null;
  leadSourceId: string | null;
  sourceLabel: string | null;
  notes: string | null;
}

interface AppointmentsTableProps {
  storeId: string;
  defaultDate: string;
  rows: AppointmentRow[];
  salespeople: SalespersonOption[];
  leadSources: LeadSourceOption[];
}

export function AppointmentsTable({
  storeId,
  defaultDate,
  rows,
  salespeople,
  leadSources,
}: AppointmentsTableProps) {
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function closeSheet() {
    setEditing(null);
    setCreating(false);
  }

  function toggleOutcome(row: AppointmentRow, field: 'kept' | 'sold', next: boolean) {
    const fd = new FormData();
    fd.set('id', row.id);
    fd.set('storeId', storeId);
    fd.set('kept', String(field === 'kept' ? next : row.kept));
    fd.set('sold', String(field === 'sold' ? next : row.sold));
    startTransition(async () => {
      const res = await setAppointmentOutcome(fd);
      setFeedback(res);
    });
  }

  function onDelete(row: AppointmentRow) {
    if (!confirm(`Delete appointment for ${row.customerName}?`)) return;
    const fd = new FormData();
    fd.set('id', row.id);
    fd.set('storeId', storeId);
    startTransition(async () => {
      const res = await deleteAppointment(fd);
      setFeedback(res);
    });
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Appointment log</CardTitle>
            <CardDescription>
              Click kept / sold pills to toggle. Edit for full details.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New appointment
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {feedback && !feedback.ok ? (
          <p className="mb-3 text-sm text-red-600">{feedback.error}</p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No appointments scheduled this month. Use{' '}
            <span className="font-medium">New appointment</span> to add one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Date</th>
                  <th className="py-2 text-left font-semibold">Customer</th>
                  <th className="py-2 text-left font-semibold">Unit</th>
                  <th className="py-2 text-left font-semibold">Salesperson</th>
                  <th className="py-2 text-left font-semibold">Source</th>
                  <th className="py-2 text-left font-semibold">Outcome</th>
                  <th className="py-2 text-right font-semibold w-1">{''}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 tabular-nums">{r.apptDate}</td>
                    <td className="py-2 font-medium">{r.customerName}</td>
                    <td className="py-2">{r.unitInterested ?? '—'}</td>
                    <td className="py-2">{r.salespersonName ?? '—'}</td>
                    <td className="py-2">{r.sourceLabel ?? '—'}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <TogglePill
                          on={r.kept}
                          label="Kept"
                          onClass="bg-blue-100 text-blue-900 hover:bg-blue-200"
                          disabled={pending}
                          onClick={() => toggleOutcome(r, 'kept', !r.kept)}
                        />
                        <TogglePill
                          on={r.sold}
                          label="Sold"
                          onClass="bg-green-100 text-green-900 hover:bg-green-200"
                          disabled={pending}
                          onClick={() => toggleOutcome(r, 'sold', !r.sold)}
                        />
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(r)}
                          aria-label="Edit appointment"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(r)}
                          aria-label="Delete appointment"
                          disabled={pending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Sheet open={creating || editing !== null} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit appointment' : 'New appointment'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'Update the appointment details.'
                : 'Log a new internet sales appointment.'}
            </SheetDescription>
          </SheetHeader>
          <AppointmentForm
            key={editing?.id ?? 'new'}
            storeId={storeId}
            defaultDate={defaultDate}
            row={editing}
            salespeople={salespeople}
            leadSources={leadSources}
            onDone={() => {
              closeSheet();
            }}
            onResult={(r) => setFeedback(r)}
          />
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function TogglePill({
  on,
  label,
  onClass,
  disabled,
  onClick,
}: {
  on: boolean;
  label: string;
  onClass: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
        on ? onClass : 'bg-muted text-muted-foreground hover:bg-muted/80',
        disabled ? 'opacity-50' : 'cursor-pointer',
      )}
    >
      {label}
    </button>
  );
}

interface AppointmentFormProps {
  storeId: string;
  defaultDate: string;
  row: AppointmentRow | null;
  salespeople: SalespersonOption[];
  leadSources: LeadSourceOption[];
  onDone: () => void;
  onResult: (r: ActionResult) => void;
}

function AppointmentForm({
  storeId,
  defaultDate,
  row,
  salespeople,
  leadSources,
  onDone,
  onResult,
}: AppointmentFormProps) {
  const [pending, startTransition] = useTransition();
  const [apptDate, setApptDate] = useState(row?.apptDate ?? defaultDate);
  const [customerName, setCustomerName] = useState(row?.customerName ?? '');
  const [unitInterested, setUnitInterested] = useState(row?.unitInterested ?? '');
  const [salespersonId, setSalespersonId] = useState(row?.salespersonUserId ?? null);
  const [sourceId, setSourceId] = useState(row?.leadSourceId ?? null);
  const [kept, setKept] = useState(row?.kept ?? false);
  const [sold, setSold] = useState(row?.sold ?? false);
  const [notes, setNotes] = useState(row?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveAppointment(fd);
      onResult(res);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <input type="hidden" name="id" value={row?.id ?? ''} />
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="salespersonUserId" value={salespersonId ?? ''} />
      <input type="hidden" name="leadSourceId" value={sourceId ?? ''} />
      <input type="hidden" name="kept" value={kept ? 'true' : 'false'} />
      <input type="hidden" name="sold" value={sold ? 'true' : 'false'} />

      <div>
        <Label htmlFor="apptDate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Date
        </Label>
        <Input
          id="apptDate"
          name="apptDate"
          type="date"
          value={apptDate}
          onChange={(e) => setApptDate(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="customerName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Customer
        </Label>
        <Input
          id="customerName"
          name="customerName"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          className="mt-1"
          placeholder="Full name"
        />
      </div>

      <div>
        <Label htmlFor="unitInterested" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Unit interest
        </Label>
        <Input
          id="unitInterested"
          name="unitInterested"
          value={unitInterested}
          onChange={(e) => setUnitInterested(e.target.value)}
          className="mt-1"
          placeholder="e.g. 2026 RZR Pro XP"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Salesperson
          </Label>
          <Select
            value={salespersonId ?? NONE}
            onValueChange={(v) => setSalespersonId(v === NONE ? null : v)}
          >
            <SelectTrigger className="mt-1">
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
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Source
          </Label>
          <Select
            value={sourceId ?? NONE}
            onValueChange={(v) => setSourceId(v === NONE ? null : v)}
          >
            <SelectTrigger className="mt-1">
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

      <div className="flex items-center gap-3 pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={kept}
            onChange={(e) => {
              const v = e.target.checked;
              setKept(v);
              if (!v) setSold(false);
            }}
            className="h-4 w-4 rounded border-input"
          />
          Kept
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sold}
            onChange={(e) => {
              const v = e.target.checked;
              setSold(v);
              if (v) setKept(true);
            }}
            className="h-4 w-4 rounded border-input"
          />
          Sold
        </label>
      </div>

      <div>
        <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
        </Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : row ? 'Save changes' : 'Log appointment'}
        </Button>
      </div>
    </form>
  );
}
