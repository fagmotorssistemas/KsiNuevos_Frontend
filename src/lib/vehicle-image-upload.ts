"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OptimizedImageBlobs } from "./image-optimization";
import { RESPONSIVE_WIDTHS } from "./image-optimization";

/** Bucket de Supabase para imágenes de vehículos */
export const VEHICLE_IMAGES_BUCKET = "vehicle-images";

/**
 * Sube la imagen principal optimizada (WEBP) y sus versiones responsive.
 * Estructura: vehicle-images/{vehicleId}/image.webp, 400.webp, 800.webp, 1200.webp
 * Devuelve la URL pública de la imagen principal (image.webp) para guardar en BD.
 */
export async function uploadOptimizedMainImage(
  supabase: SupabaseClient,
  vehicleId: string | number,
  optimized: OptimizedImageBlobs
): Promise<string> {
  const prefix = `${vehicleId}`;

  const mainPath = `${prefix}/image.webp`;
  const { error: mainError } = await supabase.storage
    .from(VEHICLE_IMAGES_BUCKET)
    .upload(mainPath, optimized.main, {
      contentType: "image/webp",
      upsert: true,
    });
  if (mainError) throw mainError;

  for (const { width, blob } of optimized.responsive) {
    const path = `${prefix}/${width}.webp`;
    const file = new File([blob], `${width}.webp`, { type: "image/webp" });
    const { error } = await supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .upload(path, file, { contentType: "image/webp", upsert: true });
    if (error) throw error;
  }

  const { data } = supabase.storage
    .from(VEHICLE_IMAGES_BUCKET)
    .getPublicUrl(mainPath);
  return data.publicUrl;
}

/**
 * Sube una imagen de galería optimizada (WEBP, una sola versión).
 * Path: vehicle-images/{vehicleId}/gallery/{index}.webp
 */
export async function uploadOptimizedGalleryImage(
  supabase: SupabaseClient,
  vehicleId: string | number,
  file: File,
  index: number
): Promise<string> {
  const path = `${vehicleId}/gallery/${index}.webp`;
  const { error } = await supabase.storage
    .from(VEHICLE_IMAGES_BUCKET)
    .upload(path, file, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage
    .from(VEHICLE_IMAGES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Dado la URL pública de la imagen principal (image.webp),
 * devuelve la URL para un ancho dado (400, 800, 1200) si existe la convención vehicle-images/{id}/...
 */
export function getResponsiveImageUrl(basePublicUrl: string, width: number): string {
  if (!basePublicUrl.includes("/image.webp")) return basePublicUrl;
  return basePublicUrl.replace("/image.webp", `/${width}.webp`);
}

/**
 * Genera srcset para una URL que sigue la convención vehicle-images/{id}/image.webp.
 * Ej: "https://.../400.webp 400w, https://.../800.webp 800w, ..."
 */
export function buildSrcSet(basePublicUrl: string): string {
  if (!basePublicUrl.includes("/image.webp")) return "";
  return RESPONSIVE_WIDTHS.map(
    (w) => `${getResponsiveImageUrl(basePublicUrl, w)} ${w}w`
  ).join(", ");
}
