/** Normaliza placa para comparar Oracle, inventoryoracle y taller_ordenes */
export function normalizePlate(placa: string): string {
  return placa.trim().toUpperCase().replace(/[\s-]/g, '')
}

/**
 * Placas ANT Ecuador (sin guion):
 * - Auto vigente: 3 letras + 4 números (ABC1234)
 * - Auto antiguo: 3 letras + 3 números (ABC123)
 * - Moto: 2 letras + 3 o 4 números (AB123 / AB1234)
 */
const ECUADOR_PLATE_RE = /^(?:[A-Z]{3}\d{3,4}|[A-Z]{2}\d{3,4})$/

export const ECUADOR_PLATE_HINT =
  'Autos: 3 letras y 3 o 4 números (ABC123 o ABC1234). Motos: 2 letras y 3 o 4 números.'

export function parseEcuadorPlate(placa: string): string | null {
  const n = normalizePlate(placa)
  if (!ECUADOR_PLATE_RE.test(n)) return null
  return n
}
