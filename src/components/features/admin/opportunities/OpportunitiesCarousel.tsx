import { VehicleWithSeller } from "@/services/scraper.service";
import { Car, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function OpportunitiesCarousel({ vehicle }: { vehicle: VehicleWithSeller }) {
    const [current, setCurrent] = useState(0);
    const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
    const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
    const imageCache = useRef<Map<number, HTMLImageElement>>(new Map());

    const allImages: string[] = [
        ...(vehicle.listing_image_urls ?? []),
    ];
    const total = allImages.length;

    useEffect(() => {
        if (total === 0) return;

        const preloadImage = (index: number) => {
            if (imageCache.current.has(index) || imageErrors.has(index)) return;

            const img = new Image();
            img.src = allImages[index];

            img.onload = () => {
                imageCache.current.set(index, img);
                setLoadedImages(prev => new Set(prev).add(index));
            };

            img.onerror = () => {
                setImageErrors(prev => new Set(prev).add(index));
            };
        };

        // Precargar imagen actual
        preloadImage(current);

        // Precargar siguiente y anterior
        const next = (current + 1) % total;
        const prev = (current - 1 + total) % total;

        preloadImage(next);
        preloadImage(prev);

    }, [current, total, allImages, imageErrors]);

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((c) => (c - 1 + total) % total);
    };

    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((c) => (c + 1) % total);
    };

    const handleImageError = (index: number) => {
        setImageErrors(prev => new Set(prev).add(index));
    };

    const isImageLoaded = loadedImages.has(current);
    const hasImageError = imageErrors.has(current);
    const showPlaceholder = !isImageLoaded || hasImageError;

    return (
        <div className="w-full lg:w-[45%] h-64 lg:h-full bg-zinc-100 relative shrink-0 group overflow-hidden">
            {allImages.length > 0 ? (
                <>
                    {/* Placeholder mientras carga */}
                    {showPlaceholder && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 bg-zinc-100">
                            {!hasImageError ? (
                                <>
                                    <div className="h-12 w-12 mb-3 border-4 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                                    <span className="text-xs font-medium">Cargando imagen...</span>
                                </>
                            ) : (
                                <>
                                    <Car className="h-20 w-20 mb-3 opacity-50" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Imagen no disponible</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Imagen actual */}
                    <img
                        key={current}
                        src={allImages[current]}
                        alt={`Foto ${current + 1}`}
                        loading="lazy"
                        decoding="async"
                        className={`h-full w-full object-cover transition-opacity duration-300 ${isImageLoaded && !hasImageError ? 'opacity-100' : 'opacity-0'
                            }`}
                        onError={() => handleImageError(current)}
                    />
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300">
                    <Car className="h-20 w-20 mb-3 opacity-50" />
                    <span className="text-xs font-bold uppercase tracking-widest">Imagen no disponible</span>
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

            {total > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 border border-white/10 z-10"
                        aria-label="Imagen anterior"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 border border-white/10 z-10"
                        aria-label="Siguiente imagen"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Contador */}
                    <div className="absolute bottom-14 right-4 px-2.5 py-1 rounded-full bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10 z-10">
                        {current + 1} / {total}
                    </div>

                    {/* Dots */}
                    <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 px-4 z-10">
                        {allImages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
                                className={`rounded-full transition-all duration-200 ${idx === current
                                    ? 'w-5 h-1.5 bg-white'
                                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                                    }`}
                                aria-label={`Ir a imagen ${idx + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
            {/* 
            <div className="absolute top-6 left-6 flex flex-wrap gap-2 max-w-[80%] z-10">
                {vehicle.tags
                    ?.filter(tag => {
                        const normalizedTag = tag.toLowerCase().replace(/\s+/g, '');
                        return !['precioalto', 'preciobajo'].includes(normalizedTag);
                    })
                    .map((tag, idx) => (
                        <span key={idx} className="px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider backdrop-blur-md bg-white/90 border border-white/50 text-zinc-900">
                            {tag}
                        </span>
                    ))
                }
            </div> */}
        </div>
    );
}