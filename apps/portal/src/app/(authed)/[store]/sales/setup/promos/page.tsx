import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { promoPublicUrl } from '@/lib/promo-url';
import { PromosManager, type PromoDoc } from './promos-manager';

export const metadata: Metadata = { title: 'Promo hub' };

interface PromosPageProps {
  params: { store: string };
}

export default async function PromosSetupPage({ params }: PromosPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const supabase = createClient();

  // Store-specific and global (store_id is null) docs both show here.
  const { data: docs } = await supabase
    .from('promo_docs')
    .select('id, title, storage_path, effective_start, effective_end, notes, store_id, created_at')
    .or(`store_id.eq.${store.id},store_id.is.null`)
    .order('effective_start', { ascending: false, nullsFirst: false });

  const mapped: PromoDoc[] = (docs ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    storagePath: d.storage_path,
    publicUrl: promoPublicUrl(d.storage_path),
    effectiveStart: d.effective_start,
    effectiveEnd: d.effective_end,
    notes: d.notes,
    isGlobal: d.store_id === null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Promo hub · ${store.name}`}
        description="Monthly rebate and financing PDFs. Store docs show here; global docs show across every store."
        actions={
          <Button asChild variant="outline">
            <Link href={`/${store.slug}/sales/setup`}>Back to setup</Link>
          </Button>
        }
      />

      <div className="px-4 md:px-6">
        <PromosManager storeId={store.id} docs={mapped} />
      </div>
    </div>
  );
}
