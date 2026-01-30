import React, { useState, useEffect, useMemo } from "react";

interface CarGalleryProps {
  mainImage: string | null;
  galleryImages?: string[] | null; 
}

export const CarGallery = ({ mainImage, galleryImages }: CarGalleryProps) => {
  const [activeImage, setActiveImage] = useState(mainImage || "/placeholder.png");
  const [isLoading, setIsLoading] = useState(true);

  // Sincronizar props
  useEffect(() => {
    if (mainImage) setActiveImage(mainImage);
  }, [mainImage]);

  // Al cambiar imagen, activamos modo carga
  useEffect(() => {
    setIsLoading(true);
  }, [activeImage]);

  const allImages = useMemo(() => {
    const rawList = [mainImage, ...(galleryImages || [])];
    const cleanList = rawList.filter(Boolean) as string[];
    return Array.from(new Set(cleanList));
  }, [mainImage, galleryImages]);

  return (
    <div className="flex flex-col gap-4">
      
      {/* --- IMAGEN PRINCIPAL --- */}
      <div className="w-full bg-neutral-100 rounded-3xl overflow-hidden border border-neutral-200 relative shadow-sm group">
        
        {/* 1. EL SKELETON (Solo el cuadrito gris) 
            - Se muestra si isLoading es true.
            - aspect-video: Le da forma rectangular automáticamente sin necesitar contenido.
            - bg-gray-200 animate-pulse: El color gris y el efecto de latido.
        */}
        {isLoading && (
          <div className="w-full aspect-video bg-gray-200 animate-pulse rounded-3xl" />
        )}

        {/* 2. LA IMAGEN REAL 
            - hidden: Si está cargando, la ocultamos TOTALMENTE (así no sale el texto "Vista 1").
            - block: Cuando carga, la mostramos.
        */}
        <img 
          src={activeImage} 
          alt="Auto" 
          onLoad={() => setIsLoading(false)}
          className={`
            w-full h-auto object-contain transition-transform duration-700 ease-out group-hover:scale-105
            ${isLoading ? 'hidden' : 'block'} 
          `}
        />
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
            <img 
              src={img} 
              alt="" // Alt vacío para que no salga texto en las miniaturas si fallan
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};