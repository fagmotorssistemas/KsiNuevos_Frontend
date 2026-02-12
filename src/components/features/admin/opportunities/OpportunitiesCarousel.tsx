import { VehicleWithSeller } from "@/services/scraper.service";
import { Car, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useState, useEffect, useRef } from "react";

function CarouselContent({
    allImages,
    current,
    setCurrent,
    loadedImages,
    imageErrors,
    handleImageError,
    total,
}: {
    allImages: string[];
    current: number;
    setCurrent: (n: number | ((c: number) => number)) => void;
    loadedImages: Set<number>;
    imageErrors: Set<number>;
    handleImageError: (i: number) => void;
    total: number;
}) {
    const isImageLoaded = loadedImages.has(current);
    const hasImageError = imageErrors.has(current);
    const showPlaceholder = !isImageLoaded || hasImageError;

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((c) => (c - 1 + total) % total);
    };

    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((c) => (c + 1) % total);
    };

    return (
        <>
            {allImages.length > 0 ? (
                <>
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

                    <img
                        key={current}
                        src={allImages[current]}
                        alt={`Foto ${current + 1}`}
                        loading="lazy"
                        decoding="async"
                        className={`h-full w-full object-cover transition-opacity duration-300 ${isImageLoaded && !hasImageError ? 'opacity-100' : 'opacity-0'}`}
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

                    <div className="absolute bottom-14 right-4 px-2.5 py-1 rounded-full bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10 z-10">
                        {current + 1} / {total}
                    </div>

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
        </>
    );
}

function LightboxModal({
    allImages,
    initialIndex,
    onClose,
}: {
    allImages: string[];
    initialIndex: number;
    onClose: () => void;
}) {
    const [current, setCurrent] = useState(initialIndex);
    const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([initialIndex]));
    const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
    const imageCache = useRef<Map<number, HTMLImageElement>>(new Map());
    const total = allImages.length;

    useEffect(() => {
        const preloadImage = (index: number) => {
            if (imageCache.current.has(index) || imageErrors.has(index)) return;
            const img = new Image();
            img.src = allImages[index];
            img.onload = () => {
                imageCache.current.set(index, img);
                setLoadedImages(prev => new Set(prev).add(index));
            };
            img.onerror = () => setImageErrors(prev => new Set(prev).add(index));
        };

        preloadImage(current);
        preloadImage((current + 1) % total);
        preloadImage((current - 1 + total) % total);
    }, [current, total, allImages, imageErrors]);

    // Cerrar con Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % total);
            if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + total) % total);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [total, onClose]);

    const handleImageError = (index: number) => setImageErrors(prev => new Set(prev).add(index));

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all z-10"
            >
                <X className="h-5 w-5" />
            </button>

            {/* Counter */}
            {total > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-bold z-10">
                    {current + 1} / {total}
                </div>
            )}

            {/* Image container */}
            <div
                className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4 flex items-center justify-center group"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative w-full h-full flex items-center justify-center">
                    {!loadedImages.has(current) && !imageErrors.has(current) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-10 w-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    )}
                    {imageErrors.has(current) ? (
                        <div className="flex flex-col items-center justify-center text-white/40">
                            <Car className="h-20 w-20 mb-3" />
                            <span className="text-xs font-bold uppercase tracking-widest">Imagen no disponible</span>
                        </div>
                    ) : (
                        <img
                            key={current}
                            src={allImages[current]}
                            alt={`Foto ${current + 1}`}
                            className={`max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${loadedImages.has(current) ? 'opacity-100' : 'opacity-0'}`}
                            onError={() => handleImageError(current)}
                        />
                    )}
                </div>

                {total > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrent(c => (c - 1 + total) % total); }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all border border-white/20 opacity-0 group-hover:opacity-100"
                            aria-label="Imagen anterior"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrent(c => (c + 1) % total); }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all border border-white/20 opacity-0 group-hover:opacity-100"
                            aria-label="Siguiente imagen"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </>
                )}
            </div>

            {/* Thumbnails strip */}
            {total > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-6 overflow-x-auto">
                    {allImages.map((src, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
                            className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${idx === current ? 'border-white scale-110' : 'border-white/20 opacity-50 hover:opacity-80'}`}
                        >
                            <img src={src} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function OpportunitiesCarousel({ vehicle, fullWidth = false }: { vehicle: VehicleWithSeller, fullWidth?: boolean }) {
    const [current, setCurrent] = useState(0);
    const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
    const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const imageCache = useRef<Map<number, HTMLImageElement>>(new Map());

    const allImages: string[] = [...(vehicle.listing_image_urls ?? [])];
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
            img.onerror = () => setImageErrors(prev => new Set(prev).add(index));
        };

        preloadImage(current);
        preloadImage((current + 1) % total);
        preloadImage((current - 1 + total) % total);
    }, [current, total, allImages, imageErrors]);

    const handleImageError = (index: number) => setImageErrors(prev => new Set(prev).add(index));

    return (
        <>
            <div className={`${fullWidth ? 'w-full h-full' : 'w-full lg:w-[45%] h-64 lg:h-full shrink-0'} bg-zinc-100 relative group overflow-hidden`}>
                <CarouselContent
                    allImages={allImages}
                    current={current}
                    setCurrent={setCurrent}
                    loadedImages={loadedImages}
                    imageErrors={imageErrors}
                    handleImageError={handleImageError}
                    total={total}
                />

                {/* Zoom trigger — solo en fullWidth */}
                {fullWidth && allImages.length > 0 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/20 opacity-0 group-hover:opacity-100 transition-all z-20"
                        aria-label="Ver en pantalla completa"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                )}
            </div>

            {lightboxOpen && (
                <LightboxModal
                    allImages={allImages}
                    initialIndex={current}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </>
    );
}