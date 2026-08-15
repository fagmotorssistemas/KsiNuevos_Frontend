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
  suv: ["suv", "jeep", "station wagon"],
  camioneta: ["camioneta", "cabina doble", "cabina simple", "doble cabina"],
  sedan: ["sedan"],
  hatchback: ["hatchback", "hatckback"],
  coupe: ["coupe", "cupe"],
  furgoneta: ["furgoneta", "furgon"],
};

/**
 * Oracle a veces pone combustible+letra en type_body (hibrido-j, hibrido-a).
 * j = jeep/SUV, a = hatchback. Otras letras no se clasifican todavía.
 */
function isHybridLetter(typeBody: string, letter: "j" | "a"): boolean {
  const n = normalizeType(typeBody);
  const escaped = letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const withSeparator = n.match(
    new RegExp(`(?:h[iy]?b+r?[iy]?d[oa]?|hybrid)\\s*[-_/.]\\s*${escaped}\\b`),
  );
  if (withSeparator) return true;

  const glued = n.replace(/[\s\-_/.]/g, "");
  return new RegExp(`^(?:h[iy]?b+r?[iy]?d[oa]?|hybrid)${escaped}$`).test(glued);
}

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
  const suvSelected = categories.some((category) => normalizeType(category) === "suv");
  const hatchbackSelected = categories.some((category) => normalizeType(category) === "hatchback");

  return cars.filter((car) => {
    if (!car.type_body) return false;
    if (accepted.has(normalizeType(car.type_body))) return true;
    if (suvSelected && isHybridLetter(car.type_body, "j")) return true;
    return hatchbackSelected && isHybridLetter(car.type_body, "a");
  });
};
