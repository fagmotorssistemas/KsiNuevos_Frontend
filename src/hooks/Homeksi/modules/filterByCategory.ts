import type { InventoryCar } from "../useInventoryData";

function normalizeType(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Tipos guardados que cuentan como cada opción del filtro de Comprar. */
const CATEGORY_ALIASES: Record<string, string[]> = {
  suv: ["suv", "jeep"],
  camioneta: ["camioneta", "cabina doble", "cabina simple", "doble cabina"],
  sedan: ["sedan"],
  hatchback: ["hatchback", "hatckback"],
  coupe: ["coupe", "cupe"],
};

function acceptedTypesFor(categories: string[]): Set<string> {
  const accepted = new Set<string>();
  for (const category of categories) {
    const key = normalizeType(category);
    const aliases = CATEGORY_ALIASES[key] ?? [key];
    for (const alias of aliases) {
      accepted.add(normalizeType(alias));
    }
  }
  return accepted;
}

export const filterByCategory = (cars: InventoryCar[], categories: string[]): InventoryCar[] => {
  if (!categories || categories.length === 0) return cars;

  const accepted = acceptedTypesFor(categories);

  return cars.filter((car) => {
    if (!car.type_body) return false;
    return accepted.has(normalizeType(car.type_body));
  });
};
