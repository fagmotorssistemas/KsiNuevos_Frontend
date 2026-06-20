import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

function getServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function logPriceHistory(
  supabase: ReturnType<typeof getServiceClient>,
  params: {
    inventoryoracleId: string
    priceType: 'internal' | 'public' | 'auto_revert'
    oldPrice: number | null
    newPrice: number | null
    reason?: string | null
    changedBy?: string | null
  }
) {
  const { error } = await supabase.from('inventory_price_history').insert({
    inventoryoracle_id: params.inventoryoracleId,
    price_type: params.priceType,
    old_price: params.oldPrice,
    new_price: params.newPrice,
    reason: params.reason ?? null,
    changed_by: params.changedBy ?? null,
  })
  if (error) {
    console.warn('[inventory-pricing] No se pudo registrar historial:', error.message)
  }
}

export type RevertPublicPricesResult = {
  reverted: number
  plates: string[]
}

/** Revierte precios públicos vencidos al interno fijo (cron diario). */
export async function revertExpiredPublicPrices(): Promise<RevertPublicPricesResult> {
  const supabase = getServiceClient()
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await supabase
    .from('inventoryoracle')
    .select('id, plate, price, internal_fixed_price, public_price_reverts_at, stock, status')
    .not('public_price_reverts_at', 'is', null)
    .lte('public_price_reverts_at', nowIso)
    .gt('stock', 0)
    .eq('status', 'disponible')

  if (error) throw new Error(error.message)

  const candidates = (rows ?? []).filter(
    (r) =>
      r.internal_fixed_price != null &&
      r.price != null &&
      r.price !== r.internal_fixed_price
  )

  const plates: string[] = []

  for (const row of candidates) {
    const fixed = row.internal_fixed_price!
    const { error: updErr } = await supabase
      .from('inventoryoracle')
      .update({
        price: fixed,
        public_price_changed_at: null,
        public_price_change_reason: null,
        public_price_reverts_at: null,
        public_price_requested_by: null,
        updated_at: nowIso,
      })
      .eq('id', row.id)

    if (updErr) {
      console.error(`[revert-public-prices] Error en ${row.plate}:`, updErr.message)
      continue
    }

    await logPriceHistory(supabase, {
      inventoryoracleId: row.id,
      priceType: 'auto_revert',
      oldPrice: row.price,
      newPrice: fixed,
      reason: 'Reversión automática tras 5 días',
    })

    if (row.plate) plates.push(row.plate)
  }

  return { reverted: plates.length, plates }
}
