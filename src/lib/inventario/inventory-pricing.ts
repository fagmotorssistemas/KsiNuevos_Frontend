/** Días que dura un precio público promocional antes de volver al interno fijo. */
export const PUBLIC_PRICE_PROMO_DAYS = 5

export type InventoryPriceFields = {
  price: number | null
  internal_fixed_price: number | null
  internal_fixed_price_set_at: string | null
  public_price_changed_at: string | null
  public_price_change_reason: string | null
  public_price_reverts_at: string | null
  stock?: number | null
  status?: string | null
}

function addDays(iso: string | Date, days: number): Date {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

export function formatInventoryPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

/** Precio que debe mostrarse al público (aplica reversión lazy si ya venció la promo). */
export function getEffectivePublicPrice(row: InventoryPriceFields): number | null {
  const internal = row.internal_fixed_price
  const publicPrice = row.price
  const revertsAt = row.public_price_reverts_at

  if (revertsAt && internal != null) {
    const expired = new Date(revertsAt).getTime() <= Date.now()
    if (expired) return internal
  }

  if (publicPrice != null && publicPrice > 0) return publicPrice
  if (internal != null && internal > 0) return internal
  return publicPrice
}

export function computePublicPriceRevertAt(from: Date = new Date()): string {
  return addDays(from, PUBLIC_PRICE_PROMO_DAYS).toISOString()
}

export function isPromoPublicPriceActive(row: InventoryPriceFields): boolean {
  if (row.internal_fixed_price == null || row.price == null) return false
  if (row.price === row.internal_fixed_price) return false
  if (!row.public_price_reverts_at) return true
  return new Date(row.public_price_reverts_at).getTime() > Date.now()
}

export function formatRevertCountdown(revertsAt: string | null): string | null {
  if (!revertsAt) return null
  const ms = new Date(revertsAt).getTime() - Date.now()
  if (ms <= 0) return 'Revierte al precio fijo'
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  return days === 1 ? 'Revierte en 1 día' : `Revierte en ${days} días`
}

export function isVehicleAvailableForPriceRules(row: {
  stock?: number | null
  status?: string | null
}): boolean {
  if (row.stock != null && row.stock <= 0) return false
  if (row.status && row.status !== 'disponible') return false
  return true
}

export function buildPromoReasonFromSeller(sellerName: string | null | undefined): string {
  const name = sellerName?.trim()
  return name ? `Promo solicitada por ${name}` : 'Precio promocional'
}
