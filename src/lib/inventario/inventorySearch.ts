/** Campos de inventario que se pueden buscar en la tabla de ventas. */
export type InventorySearchableCar = {
    brand?: string | null;
    model?: string | null;
    year?: number | string | null;
    color?: string | null;
    plate?: string | null;
    plate_short?: string | null;
    vin?: string | null;
    type_body?: string | null;
    location?: string | null;
};

const compact = (value: string) => value.replace(/[\s\-_]/g, "");

export function matchesInventorySearch(
    search: string,
    values: Array<string | number | null | undefined>
): boolean {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const haystack = values
        .filter((value) => value != null && String(value).trim() !== "")
        .join(" ")
        .toLowerCase();

    const compactHaystack = compact(haystack);

    return tokens.every((token) => {
        if (haystack.includes(token)) return true;
        const compactToken = compact(token);
        return compactToken.length > 0 && compactHaystack.includes(compactToken);
    });
}

export function carMatchesInventorySearch(
    car: InventorySearchableCar,
    search: string
): boolean {
    return matchesInventorySearch(search, [
        car.brand,
        car.model,
        car.year,
        car.color,
        car.plate,
        car.plate_short,
        car.vin,
        car.type_body,
        car.location,
    ]);
}
