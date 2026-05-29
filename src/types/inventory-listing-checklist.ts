export type ListingChecklistKey =
  | "patio_tuerca"
  | "marketplace"
  | "pagina_web"
  | "ficha_tecnica";

export type ListingChecklist = Record<ListingChecklistKey, boolean>;

export const EMPTY_LISTING_CHECKLIST: ListingChecklist = {
  patio_tuerca: false,
  marketplace: false,
  pagina_web: false,
  ficha_tecnica: false,
};

export function parseListingChecklist(raw: unknown): ListingChecklist {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_LISTING_CHECKLIST };
  }
  const o = raw as Record<string, unknown>;
  return {
    patio_tuerca: Boolean(o.patio_tuerca),
    marketplace: Boolean(o.marketplace),
    pagina_web: Boolean(o.pagina_web),
    ficha_tecnica: Boolean(o.ficha_tecnica),
  };
}

export function countListingChecklistDone(checklist: ListingChecklist): number {
  return Object.values(checklist).filter(Boolean).length;
}

export type ListingChecklistPhotoInput = {
  img_main_url?: string | null;
  img_gallery_urls?: string[] | null;
};

/** Tiene al menos foto principal o imagen en galería */
export function hasVehiclePhotos(car: ListingChecklistPhotoInput): boolean {
  if (car.img_main_url?.trim()) return true;
  return (car.img_gallery_urls?.filter((u) => u?.trim()).length ?? 0) > 0;
}

/** Combina checklist guardado con reglas automáticas (p. ej. fotos → página web) */
export function resolveListingChecklist(
  raw: unknown,
  car?: ListingChecklistPhotoInput
): ListingChecklist {
  const base = parseListingChecklist(raw);
  if (!car) return base;
  return {
    ...base,
    pagina_web: hasVehiclePhotos(car),
  };
}

/** Al guardar vehículo, persiste pagina_web según fotos actuales */
export function mergeListingChecklistForSave(
  checklist: ListingChecklist,
  car: ListingChecklistPhotoInput
): ListingChecklist {
  return {
    ...checklist,
    pagina_web: hasVehiclePhotos(car),
  };
}
