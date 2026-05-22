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
