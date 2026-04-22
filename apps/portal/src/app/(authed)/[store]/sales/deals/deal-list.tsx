import Link from 'next/link';
import { cn } from '@pe/ui';

type DealStatus =
  | 'pending_finance'
  | 'pending_salesperson'
  | 'complete'
  | 'delivered';

export interface DealRow {
  id: string;
  dealDate: string;
  dealNumber: string | null;
  customerName: string;
  stockNumber: string | null;
  pgaTotal: number | null;
  status: DealStatus;
  salespersonName: string | null;
  unitTypeLabel: string | null;
}

const STATUS_LABEL: Record<DealStatus, string> = {
  pending_finance: 'Awaiting finance',
  pending_salesperson: 'Missing front-end',
  complete: 'Complete',
  delivered: 'Delivered',
};

const STATUS_CLASS: Record<DealStatus, string> = {
  pending_finance: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  pending_salesperson: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  complete: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200',
  delivered: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200',
};

interface DealListProps {
  rows: DealRow[];
  showSalesperson: boolean;
  storeSlug: string;
}

export function DealList({ rows, showSalesperson, storeSlug }: DealListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No deals logged this month yet. Use <span className="font-medium">Log a deal</span> to add the first one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Date</th>
            <th className="px-3 py-2 text-left font-semibold">Deal #</th>
            <th className="px-3 py-2 text-left font-semibold">Customer</th>
            {showSalesperson ? (
              <th className="px-3 py-2 text-left font-semibold">Salesperson</th>
            ) : null}
            <th className="px-3 py-2 text-left font-semibold">Unit</th>
            <th className="px-3 py-2 text-left font-semibold">Stock #</th>
            <th className="px-3 py-2 text-right font-semibold">PG&A $</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 tabular-nums">{r.dealDate}</td>
              <td className="px-3 py-2 font-mono">{r.dealNumber ?? '\u2014'}</td>
              <td className="px-3 py-2 font-medium">{r.customerName}</td>
              {showSalesperson ? (
                <td className="px-3 py-2">{r.salespersonName ?? '\u2014'}</td>
              ) : null}
              <td className="px-3 py-2">{r.unitTypeLabel ?? '\u2014'}</td>
              <td className="px-3 py-2 font-mono">{r.stockNumber ?? '\u2014'}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.pgaTotal !== null ? `$${r.pgaTotal.toLocaleString()}` : '\u2014'}
              </td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                    STATUS_CLASS[r.status],
                  )}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Click a row in a future build to open the deal detail and complete the
        back-end.{' '}
        <Link
          href={`/${storeSlug}/sales/deals/new`}
          className="underline underline-offset-2"
        >
          Log another deal
        </Link>
        .
      </p>
    </div>
  );
}
