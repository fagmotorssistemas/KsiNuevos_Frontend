export type InventoryBodyCategory = 'suv' | 'camioneta' | 'sedan' | 'otros'
export type InventoryBodyCategoryFilter = 'all' | InventoryBodyCategory

export const INVENTORY_BODY_FILTER_OPTIONS: {
    value: InventoryBodyCategoryFilter
    label: string
    hint: string
}[] = [
    { value: 'all', label: 'Todos', hint: 'Toda la flota' },
    { value: 'suv', label: 'SUV (jeep)', hint: 'Jeep, SUV, station wagon' },
    { value: 'camioneta', label: 'Camionetas', hint: 'Doble cabina, furgoneta, cajón' },
    { value: 'sedan', label: 'Sedans', hint: 'Sedan, hatchback, cupé' },
    { value: 'otros', label: 'Otros', hint: 'Blindado, particular y el resto' },
]

function foldType(value: string | null | undefined): string {
    return (value ?? '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim()
}

function isHybridLetter(typeBody: string, letter: 'j' | 'a'): boolean {
    const escaped = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(?:h[iy]?b+r?[iy]?d[oa]?|hybrid)\\s*[-_/.]\\s*${escaped}\\b`).test(typeBody)) {
        return true
    }
    const glued = typeBody.replace(/[\s\-_/.]/g, '')
    return new RegExp(`^(?:h[iy]?b+r?[iy]?d[oa]?|hybrid)${escaped}$`).test(glued)
}

/** Agrupa type_body de Oracle en SUV / Camioneta / Sedan / Otros. */
export function classifyInventoryBody(typeBody: string | null | undefined): InventoryBodyCategory {
    const t = foldType(typeBody)
    if (!t) return 'otros'

    if (
        t === 'jeep' ||
        t === 'suv' ||
        t.includes('jeep') ||
        t.includes('suv') ||
        t.includes('station wagon') ||
        isHybridLetter(t, 'j')
    ) {
        return 'suv'
    }

    if (
        t.includes('camioneta') ||
        t.includes('cabina') ||
        t.includes('furgon') ||
        t.includes('pickup') ||
        t.includes('pick up') ||
        t.includes('cajon') ||
        t.includes('platon')
    ) {
        return 'camioneta'
    }

    if (
        t.includes('sedan') ||
        t.includes('hatch') ||
        t.includes('hatck') ||
        t.includes('coupe') ||
        t.includes('cupe') ||
        t.includes('automovil') ||
        t.includes('berlina') ||
        isHybridLetter(t, 'a')
    ) {
        return 'sedan'
    }

    return 'otros'
}
