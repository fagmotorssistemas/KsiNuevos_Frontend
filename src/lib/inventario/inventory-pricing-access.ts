/** Roles que pueden ver precios interno/público en inventario vendedor. */
export function canViewInventoryPrices(role: string | null | undefined): boolean {
    const r = role?.toLowerCase() ?? '';
    return r === 'admin' || r === 'marketing' || r === 'vendedor';
}

/** Solo admin puede crear/editar precios y promos. */
export function canEditInventoryPrices(role: string | null | undefined): boolean {
    return role?.toLowerCase() === 'admin';
}
