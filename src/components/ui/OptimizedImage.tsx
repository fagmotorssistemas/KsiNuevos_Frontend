"use client";

import { useState, useMemo } from "react";
import { buildSrcSet } from "@/lib/vehicle-image-upload";

const RESPONSIVE_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 400px";

export interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "srcSet" | "sizes"> {
  /** URL de la imagen (puede ser formato vehicle-images/.../image.webp o URL legacy) */
  src: string;
  /** Ancho intrínseco (opcional, para evitar layout shift) */
  width?: number;
  /** Alto intrínseco (opcional) */
  height?: number;
  /** Lazy loading: true por defecto para imágenes fuera del viewport */
  loading?: "lazy" | "eager";
  /** Clase del contenedor del placeholder mientras carga */
  containerClassName?: string;
}

type OptimizedImagePropsWithLoad = OptimizedImageProps & {
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
};

/**
 * Imagen responsive con srcset (400, 800, 1200), lazy loading y estado de carga.
 * Si la URL sigue la convención vehicle-images/.../image.webp usa srcset;
 * si no, usa la URL tal cual (compatibilidad con imágenes antiguas).
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  className = "",
  containerClassName = "",
  onLoad,
  ...rest
}: OptimizedImagePropsWithLoad) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    onLoad?.(e);
  };

  const isOptimizedUrl = useMemo(
    () => typeof src === "string" && src.includes("/image.webp"),
    [src]
  );
  const srcSet = useMemo(
    () => (isOptimizedUrl ? buildSrcSet(src) : ""),
    [src, isOptimizedUrl]
  );

  return (
    <span className={`relative block overflow-hidden ${containerClassName}`}>
      {!loaded && !error && (
        <span
          className="absolute inset-0 flex items-center justify-center bg-neutral-100 animate-pulse"
          aria-hidden
        />
      )}
      <img
        src={src}
        alt={alt ?? ""}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className={`${className} ${!loaded && !error ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        srcSet={srcSet || undefined}
        sizes={srcSet ? RESPONSIVE_SIZES : undefined}
        onLoad={handleLoad}
        onError={() => setError(true)}
        {...rest}
      />
    </span>
  );
}
