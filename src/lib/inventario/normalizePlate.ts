/** Normaliza placa para comparar Oracle, inventoryoracle y taller_ordenes */
export function normalizePlate(placa: string): string {
  return placa.trim().toUpperCase().replace(/[\s-]/g, '')
}
