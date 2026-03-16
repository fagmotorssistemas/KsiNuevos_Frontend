import React, { useState, useEffect, useMemo } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface CarGalleryProps {
  mainImage: string | null;
  galleryImages?: string[] | null; 
}

export const CarGallery = ({ mainImage, galleryImages }: CarGalleryProps) => {
  const [activeImage, setActiveImage] = useState(mainImage || "");

  // Sincronizar props
  useEffect(() => {
    if (mainImage) setActiveImage(mainImage);
  }, [mainImage]);

  const allImages = useMemo(() => {
    const rawList = [mainImage, ...(galleryImages || [])];
    const cleanList = rawList.filter(Boolean) as string[];
    return Array.from(new Set(cleanList));
  }, [mainImage, galleryImages]);

  return (
    <div className="flex flex-col gap-4">
      
      {/* --- IMAGEN PRINCIPAL (solo la foto, sin cuadro gris) --- */}
      <div className="w-full rounded-3xl overflow-hidden border border-neutral-200 relative shadow-sm group bg-neutral-100">
        {activeImage ? (
          <OptimizedImage
            src={activeImage}
            alt="Vehículo"
            loading="eager"
            className="w-full h-auto object-contain transition-transform duration-700 ease-out group-hover:scale-105"
            containerClassName="block"
          />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-neutral-400 text-sm">
            Sin imagen
          </div>
        )}
      </div>

      {/* --- MINIATURAS --- */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide pt-2 px-1">
        {allImages.map((img, idx) => (
          <button
            key={`${img}-${idx}`}
            onClick={() => setActiveImage(img)}
            // bg-gray-200 aquí asegura que si la miniatura tarda, se vea un cuadrito gris de fondo
            className={`
              flex-shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 relative bg-gray-200
              ${activeImage === img 
                ? "border-red-600 ring-2 ring-red-100 scale-105 opacity-100 z-10 shadow-md" 
                : "border-transparent opacity-60 hover:opacity-100 hover:border-neutral-300"
              }
            `}
          >
            <OptimizedImage
              src={img}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};