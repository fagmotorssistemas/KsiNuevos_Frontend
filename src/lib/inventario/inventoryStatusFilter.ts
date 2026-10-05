type InventoryStatusCar = {
    status?: string | null
    location?: string | null
}

/**
 * El desplegable de estado es independiente de las tarjetas de stock.
 * "Taller" agrupa la ubicación física y el estado `mantenimiento`.
 */
export function matchesInventoryStatusFilter(car: InventoryStatusCar, status: string): boolean {
    if (status === 'all') return true
    if (status === 'mantenimiento') {
        return car.status === 'mantenimiento' || car.location === 'taller'
    }
    return car.status === status
}
