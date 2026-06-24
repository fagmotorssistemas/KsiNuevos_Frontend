import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface CarGalleryProps {
  mainImage: string | null;
  galleryImages?: string[] | null;
}

const THUMB_SCROLL_STEP = 108;

export const CarGallery = ({ mainImage, galleryImages }: CarGalleryProps) => {
  const [activeImage, setActiveImage] = useState(mainImage || "");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainImage) setActiveImage(mainImage);
  }, [mainImage]);

  const allImages = useMemo(() => {
    const rawList = [mainImage, ...(galleryImages || [])];
    const cleanList = rawList.filter(Boolean) as string[];
    return Array.from(new Set(cleanList));
  }, [mainImage, galleryImages]);

  const activeIndex = Math.max(0, allImages.findIndex((img) => img === activeImage));

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [allImages.length, updateScrollState]);

  useEffect(() => {
    const el = scrollRef.current;
    const idx = allImages.findIndex((img) => img === activeImage);
    if (!el || idx < 0) return;
    const thumb = el.children[idx] as HTMLElement | undefined;
    thumb?.scrollIntoView({ inline: "nearest", behavior: "smooth", block: "nearest" });
  }, [activeImage, allImages]);

  const scrollThumbnails = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -THUMB_SCROLL_STEP : THUMB_SCROLL_STEP,
      behavior: "smooth",
    });
  };

  const goToImage = (direction: "prev" | "next") => {
    if (allImages.length <= 1) return;
    const next =
      direction === "prev"
        ? (activeIndex - 1 + allImages.length) % allImages.length
        : (activeIndex + 1) % allImages.length;
    setActiveImage(allImages[next]);
  };

  const showThumbNav = allImages.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full rounded-3xl overflow-hidden border border-neutral-200 relative shadow-sm group bg-neutral-100">
        {activeImage ? (
          <>
            <OptimizedImage
              src={activeImage}
              alt="Vehículo"
              loading="eager"
              className="w-full h-auto object-contain transition-transform duration-700 ease-out group-hover:scale-105"
              containerClassName="block"
            />
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goToImage("prev")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md border border-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => goToImage("next")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md border border-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white tabular-nums">
                  {activeIndex + 1} / {allImages.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-neutral-400 text-sm">
            Sin imagen
          </div>
        )}
      </div>

      {showThumbNav && (
        <div className="relative">
          {canScrollLeft && (
            <div
              className="pointer-events-none absolute left-0 top-2 bottom-6 z-10 w-10 bg-gradient-to-r from-white via-white/80 to-transparent"
              aria-hidden
            />
          )}
          {canScrollRight && (
            <div
              className="pointer-events-none absolute right-0 top-2 bottom-6 z-10 w-10 bg-gradient-to-l from-white via-white/80 to-transparent"
              aria-hidden
            />
          )}

          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollThumbnails("left")}
              className="absolute left-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50"
              aria-label="Ver fotos anteriores"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollThumbnails("right")}
              className="absolute right-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50"
              aria-label="Ver más fotos"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-9 pt-2 pb-1"
          >
            {allImages.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={() => setActiveImage(img)}
                className={`
                  flex-shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 relative
                  ${
                    activeImage === img
                      ? "border-red-600 ring-2 ring-red-100 scale-105 opacity-100 z-10 shadow-md"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-neutral-300"
                  }
                `}
              >
                <OptimizedImage
                  src={img}
                  alt={`Foto ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  containerClassName="absolute inset-0 w-full h-full"
                />
              </button>
            ))}
          </div>

          <p className="text-center text-[11px] font-medium text-neutral-500 mt-2">
            {allImages.length} fotos · usa las flechas o desliza para ver más
          </p>
        </div>
      )}
    </div>
  );
};
