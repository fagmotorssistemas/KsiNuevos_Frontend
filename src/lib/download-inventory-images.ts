import type { InventoryCar } from '@/hooks/useInventory';

function sanitizeBaseName(raw: string): string {
    const s = raw.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return s.slice(0, 48) || 'vehiculo';
}

function extensionFromMime(mime: string): string {
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    return 'jpg';
}

function extensionFromUrl(url: string): string | null {
    const m = url.split('?')[0]?.match(/\.(webp|png|jpe?g)$/i);
    if (!m) return null;
    const e = m[1].toLowerCase();
    return e === 'jpeg' ? 'jpg' : e;
}

/** URLs únicas en orden: portada primero, luego galería. */
export function getInventoryImageUrls(car: Pick<InventoryCar, 'img_main_url' | 'img_gallery_urls'>): string[] {
    const ordered = [car.img_main_url, ...(car.img_gallery_urls || [])].filter(
        (u): u is string => typeof u === 'string' && u.length > 0,
    );
    return [...new Set(ordered)];
}

/**
 * Descarga todas las imágenes del ítem (portada + galería) como archivos individuales en el navegador.
 */
export async function downloadAllInventoryImages(car: InventoryCar): Promise<void> {
    const urls = getInventoryImageUrls(car);
    if (urls.length === 0) {
        window.alert('Este vehículo no tiene imágenes para descargar.');
        return;
    }

    const base = sanitizeBaseName(car.plate || car.plate_short || car.id);

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
            const res = await fetch(url, { mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const ext = extensionFromMime(blob.type) || extensionFromUrl(url) || 'jpg';
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = `${base}-${String(i + 1).padStart(2, '0')}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
        } catch {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        // Pequeña pausa para que el navegador no bloquee descargas múltiples.
        await new Promise((r) => setTimeout(r, 350));
    }
}
