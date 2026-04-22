'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@pe/ui';
import { saveDealDetail, deleteDeal, type SaveResult } from './actions';

export interface UnitTypeOption {
  id: string;
  label: string;
}

export interface SalespersonOption {
  id: string;
  label: string;
}

export interface FniProductOption {
  id: string;
  label: string;
}

type DealStatus =
  | 'pending_finance'
  | 'pending_salesperson'
  | 'complete'
  | 'delivered';

export interface DealDetail {
  id: string;
  dealDate: string;
  dealNumber: string;
  customerName: string;
  stockNumber: string;
  pgaTotal: number | null;
  unitCount: number;
  unitTypeId: string | null;
  salespersonUserId: string | null;
  financeManagerUserId: string | null;
  financeReserve: number | null;
  backEndTotal: number | null;
  status: DealStatus;
  notes: string;
  checkedFniProductIds: string[];
}

const UNSET = '__unset__';

interface DealDetailFormProps {
  storeId: string;
  storeSlug: string;
  deal: DealDetail;
  unitTypes: UnitTypeOption[];
  salespeople: SalespersonOption[];
  financeManagers: SalespersonOption[];
  fniProducts: FniProductOption[];
}

export function DealDetailForm({
  storeId,
  storeSlug,
  deal,
  unitTypes,
  salespeople,
  financeManagers,
  fniProducts,
}: DealDetailFormProps) {
  const router = useRouter();
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);

  const [salespersonId, setSalespersonId] = useState<string>(deal.salespersonUserId ?? '');
  const [financeManagerId, setFinanceManagerId] = useState<string>(
    deal.financeManagerUserId ?? '',
  );
  const [unitTypeId, setUnitTypeId] = useState<string>(deal.unitTypeId ?? '');
  const [checkedFni, setCheckedFni] = useState<Set<string>>(
    new Set(deal.checkedFniProductIds),
  );
  const [markDelivered, setMarkDelivered] = useState<boolean>(deal.status === 'delivered');

  function toggleFni(id: string, checked: boolean) {
    setCheckedFni((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSave(async () => {
      const res = await saveDealDetail(formData);
      setResult(res);
    });
  }

  function onDelete() {
    if (!confirm(`Delete deal for ${deal.customerName}?`)) return;
    const formData = new FormData();
    formData.set('dealId', deal.id);
    formData.set('storeSlug', storeSlug);
    startDelete(async () => {
      const res = await deleteDeal(formData);
      setResult(res);
      if (res.ok) router.push(`/${storeSlug}/sales/deals`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-6">
      <input type="hidden" name="dealId" value={deal.id} />
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="salespersonUserId" value={salespersonId} />
      <input type="hidden" name="financeManagerUserId" value={financeManagerId} />
      <input type="hidden" name="unitTypeId" value={unitTypeId} />
      {Array.from(checkedFni).map((id) => (
        <input key={id} type="hidden" name="fniProductIds" value={id} />
      ))}

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Deal
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="dealDate">Date</Label>
            <Input
              id="dealDate"
              name="dealDate"
              type="date"
              defaultValue={deal.dealDate}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="dealNumber">Deal #</Label>
            <Input
              id="dealNumber"
              name="dealNumber"
              defaultValue={deal.dealNumber}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="customerName">Customer</Label>
            <Input
              id="customerName"
              name="customerName"
              defaultValue={deal.customerName}
              className="mt-1"
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Front-end (salesperson)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Salesperson</Label>
            <Select
              value={salespersonId || UNSET}
              onValueChange={(v) => setSalespersonId(v === UNSET ? '' : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Not set</SelectItem>
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
            <Select
              value={unitTypeId || UNSET}
              onValueChange={(v) => setUnitTypeId(v === UNSET ? '' : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Not set</SelectItem>
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
              defaultValue={deal.stockNumber}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="unitCount">Unit count</Label>
            <Input
              id="unitCount"
              name="unitCount"
              type="number"
              min={1}
              defaultValue={deal.unitCount}
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
              defaultValue={deal.pgaTotal ?? ''}
              className="mt-1 text-right"
              inputMode="numeric"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Back-end (finance)
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Finance manager</Label>
            <Select
              value={financeManagerId || UNSET}
              onValueChange={(v) => setFinanceManagerId(v === UNSET ? '' : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Not set</SelectItem>
                {financeManagers.map((sp) => (
                  <SelectItem key={sp.id} value={sp.id}>
                    {sp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="financeReserve">Finance reserve $</Label>
            <Input
              id="financeReserve"
              name="financeReserve"
              type="number"
              min={0}
              step="1"
              defaultValue={deal.financeReserve ?? ''}
              className="mt-1 text-right"
              inputMode="numeric"
            />
          </div>
          <div>
            <Label htmlFor="backEndTotal">Back-end total $</Label>
            <Input
              id="backEndTotal"
              name="backEndTotal"
              type="number"
              min={0}
              step="1"
              defaultValue={deal.backEndTotal ?? ''}
              className="mt-1 text-right"
              inputMode="numeric"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            F&I products sold
          </Label>
          {fniProducts.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No F&I products configured for this store.
            </p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {fniProducts.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded-md border bg-background p-2 text-sm"
                >
                  <Checkbox
                    checked={checkedFni.has(p.id)}
                    onCheckedChange={(c) => toggleFni(p.id, c === true)}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={deal.notes}
            className="mt-1"
            rows={3}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="markDelivered"
            checked={markDelivered}
            onCheckedChange={(c) => setMarkDelivered(c === true)}
          />
          <span>Delivered</span>
          <span className="text-xs text-muted-foreground">
            (mark only when customer has taken possession)
          </span>
        </label>
      </section>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 text-sm">
          {result?.ok ? (
            <span className="text-green-600">{result.message}</span>
          ) : result && !result.ok ? (
            <span className="text-red-600">{result.error}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={deletePending}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {deletePending ? 'Deleting\u2026' : 'Delete'}
          </Button>
          <Button type="submit" disabled={savePending}>
            {savePending ? 'Saving\u2026' : 'Save deal'}
          </Button>
        </div>
      </div>
    </form>
  );
}
