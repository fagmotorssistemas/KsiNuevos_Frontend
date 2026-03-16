"use client";

import imageCompression, { type Options } from "browser-image-compression";

/** Calidad WEBP (0-1). 0.75 = 75% */
const UPLOAD_QUALITY = 0.75;
/** Ancho máximo de la imagen maestra que se sube */
const MAX_WIDTH = 1600;
/** Tamaños para srcset responsive (px) */
export const RESPONSIVE_WIDTHS = [400, 800, 1200] as const;

export type OptimizedImageBlobs = {
  /** Archivo principal (max 1600px, WEBP, sin metadata) para subir */
  main: File;
  /** Blobs por tamaño para srcset (400, 800, 1200) */
  responsive: { width: number; blob: Blob }[];
};

const WEBP_OPTIONS: Options = {
  maxSizeMB: 2,
  maxWidthOrHeight: MAX_WIDTH,
  useWebWorker: true,
  initialQuality: UPLOAD_QUALITY,
  fileType: "image/webp",
  preserveExif: false,
};

/**
 * Comprime y convierte una imagen a WEBP (max 1600px, calidad 75, sin metadata).
 * Opcionalmente genera versiones 400, 800, 1200 para srcset.
 */
export async function compressAndConvertToWebP(
  file: File,
  options?: { generateResponsiveSizes?: boolean }
): Promise<OptimizedImageBlobs> {
  const generateResponsiveSizes = options?.generateResponsiveSizes ?? true;

  const compressed = await imageCompression(file, WEBP_OPTIONS);

  if (!generateResponsiveSizes) {
    return { main: compressed, responsive: [] };
  }

  const responsive: { width: number; blob: Blob }[] = [];
  const img = await createImageBitmap(compressed);

  for (const width of RESPONSIVE_WIDTHS) {
    if (img.width <= width && img.height <= width) continue;
    const blob = await resizeToBlob(img, width, UPLOAD_QUALITY);
    responsive.push({ width, blob });
  }

  img.close();
  return { main: compressed, responsive };
}

/**
 * Redimensiona un ImageBitmap a un ancho máximo y devuelve un Blob WEBP.
 */
function resizeToBlob(
  source: ImageBitmap,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 2d not available"));
      return;
    }
    const scale = Math.min(maxWidth / source.width, maxWidth / source.height, 1);
    const w = Math.round(source.width * scale);
    const h = Math.round(source.height * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/webp",
      quality
    );
  });
}

/**
 * Comprime una imagen para subida (una sola versión WEBP optimizada).
 * Usar cuando no necesites generar 400/800/1200 (p. ej. galería).
 */
export async function compressImageForUpload(file: File): Promise<File> {
  return imageCompression(file, WEBP_OPTIONS);
}
