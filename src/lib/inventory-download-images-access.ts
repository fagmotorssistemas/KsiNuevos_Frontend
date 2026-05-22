/** Restricción temporal (7 días): ocultar descarga masiva de imágenes en inventario de ventas. */
const BLOCKED_USER_ID = "b747bd6b-2a02-46a2-af09-9b3bcc688aa8";

/** Ecuador (Guayaquil): UTC-5 fijo, sin horario de verano. */
const ECUADOR_TZ = "-05:00";

/** Oculto desde el 22 may 2026, 10:00 (hora Ecuador). */
const BLOCKED_FROM_MS = new Date(`2026-05-22T10:00:00${ECUADOR_TZ}`).getTime();

/** Vuelve solo el 29 may 2026, 10:00 (hora Ecuador) — 7 días después, sin tocar código. */
const BLOCKED_UNTIL_MS = new Date(`2026-05-29T10:00:00${ECUADOR_TZ}`).getTime();

export function canShowInventoryDownloadAllImages(userId?: string | null): boolean {
    if (!userId || userId !== BLOCKED_USER_ID) return true;

    const now = Date.now();
    if (now < BLOCKED_FROM_MS || now >= BLOCKED_UNTIL_MS) return true;

    return false;
}
