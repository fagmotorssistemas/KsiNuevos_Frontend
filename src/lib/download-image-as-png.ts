function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
        img.src = src;
    });
}

async function blobToPngBlob(blob: Blob): Promise<Blob> {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const img = await loadImage(objectUrl);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No se pudo preparar la imagen");
        ctx.drawImage(img, 0, 0);
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (png) => (png ? resolve(png) : reject(new Error("No se pudo convertir a PNG"))),
                "image/png"
            );
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function sourceToPngBlob(src: string): Promise<Blob> {
    try {
        const response = await fetch(src, { mode: "cors" });
        if (response.ok) {
            const blob = await response.blob();
            if (blob.type === "image/png") return blob;
            return blobToPngBlob(blob);
        }
    } catch {
        // Fallback: canvas vía <img> (blob/data URLs o CORS permisivo)
    }

    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la imagen");
    ctx.drawImage(img, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (png) => (png ? resolve(png) : reject(new Error("No se pudo convertir a PNG"))),
            "image/png"
        );
    });
}

export async function downloadImageAsPng(src: string, filename: string): Promise<void> {
    const pngBlob = await sourceToPngBlob(src);
    const url = URL.createObjectURL(pngBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function sanitizeDownloadFilename(value: string): string {
    const cleaned = value
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    return cleaned || "vehiculo";
}

export type DownloadImageItem = {
    src: string;
    filename: string;
};

export async function downloadImagesAsPngZip(
    items: DownloadImageItem[],
    zipFilename: string
): Promise<void> {
    if (items.length === 0) {
        throw new Error("No hay imágenes para descargar");
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const folderName = sanitizeDownloadFilename(zipFilename.replace(/\.zip$/i, ""));
    const folder = zip.folder(folderName);
    if (!folder) throw new Error("No se pudo crear el archivo");

    for (const { src, filename } of items) {
        const pngBlob = await sourceToPngBlob(src);
        const name = filename.endsWith(".png") ? filename : `${filename}.png`;
        folder.file(name, await pngBlob.arrayBuffer());
    }

    const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const url = URL.createObjectURL(content);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
}
