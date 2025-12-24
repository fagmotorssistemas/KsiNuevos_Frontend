import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import type { InventoryCar } from "@/hooks/useInventory";

interface ImageViewerModalProps {
    car: InventoryCar;
    onClose: () => void;
}

export function ImageViewerModal({ car, onClose }: ImageViewerModalProps) {
    // 1. Construimos la lista completa de imágenes (Principal + Galería)
    // Filtramos valores nulos o vacíos
    const images = [
        car.img_main_url,
        ...(car.img_gallery_urls || [])
    ].filter((url): url is string => !!url && url.length > 0);

    const [currentIndex, setCurrentIndex] = useState(0);

    // Navegación
    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, [images.length]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }, [images.length]);

    // Teclado (Flechas y Escape)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") nextSlide();
            if (e.key === "ArrowLeft") prevSlide();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, nextSlide, prevSlide]);

    if (images.length === 0) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="text-white flex flex-col items-center gap-3 opacity-50">
                    <ImageIcon className="w-16 h-16" />
                    <span className="text-lg font-medium">Sin imágenes disponibles</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
            
            {/* Botón Cerrar */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-white/20 text-white/70 hover:text-white rounded-full transition-all"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Información del Vehículo (Flotante Arriba Izquierda) */}
            <div className="absolute top-4 left-4 z-50 text-white">
                <h3 className="text-lg font-bold drop-shadow-md">
                    {car.brand} {car.model}
                </h3>
                <p className="text-xs text-white/70">
                    {currentIndex + 1} / {images.length}
                </p>
            </div>

            {/* Contenedor Principal Imagen */}
            <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
                
                {/* Flecha Izquierda */}
                {images.length > 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                        className="absolute left-4 md:left-8 p-3 rounded-full bg-black/20 hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-sm hidden md:flex"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                )}

                {/* IMAGEN ACTUAL */}
                <img 
                    src={images[currentIndex]} 
                    alt={`View ${currentIndex}`}
                    className="max-h-full max-w-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-200"
                />

                {/* Flecha Derecha */}
                {images.length > 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                        className="absolute right-4 md:right-8 p-3 rounded-full bg-black/20 hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-sm hidden md:flex"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>
                )}
            </div>

            {/* Miniaturas (Bottom Strip) */}
            {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] p-2 bg-black/40 rounded-xl backdrop-blur-sm">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`
                                relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0
                                ${idx === currentIndex ? 'border-brand-500 opacity-100 scale-110' : 'border-transparent opacity-50 hover:opacity-80'}
                            `}
                        >
                            <img src={img} alt="thumb" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}