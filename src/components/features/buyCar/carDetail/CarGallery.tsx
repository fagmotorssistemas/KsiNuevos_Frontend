import React, { useState } from "react";

interface CarGalleryProps {
  mainImage: string | null;
  galleryImages?: string[] | null; 
}

export const CarGallery = ({ mainImage, galleryImages }: CarGalleryProps) => {
  const [activeImage, setActiveImage] = useState(mainImage || "/placeholder.png");

  const allImages = galleryImages && galleryImages.length > 0 
    ? [mainImage, ...galleryImages].filter(Boolean) as string[]
    : [mainImage || "/placeholder.png"];

  return (
    <div className="flex flex-col gap-4">
      {/* IMAGEN GRANDE PRINCIPAL */}
      <div className="w-full aspect-[4/3] md:aspect-[16/9] bg-neutral-100 rounded-3xl overflow-hidden border border-neutral-200 relative shadow-sm group">
        <img 
          src={activeImage} 
          alt="Vista principal del auto" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </div>

      {/* CARRUSEL DE MINIATURAS */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide pt-2">
        {allImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setActiveImage(img)}
            // CAMBIO: Ring y Borde Rojo
            className={`flex-shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
              activeImage === img 
                ? "border-red-600 ring-2 ring-red-100 scale-105" 
                : "border-transparent opacity-60 hover:opacity-100 hover:border-neutral-300"
            }`}
          >
            <img 
              src={img} 
              alt={`Vista ${idx + 1}`} 
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};