import React, { useState } from "react";

interface CarGalleryProps {
  mainImage: string | null;
  // Si en tu base de datos tienes un campo 'gallery_urls', pásalo aquí.
  // Por ahora asumo que puede ser un array de strings o undefined.
  galleryImages?: string[] | null; 
}

export const CarGallery = ({ mainImage, galleryImages }: CarGalleryProps) => {
  // Estado para cambiar la imagen grande al hacer click en las pequeñas
  const [activeImage, setActiveImage] = useState(mainImage || "/placeholder.png");

  // Combinamos la principal con la galería para tener todas las fotos
  // Si no hay galería, creamos un array solo con la principal para evitar errores
  const allImages = galleryImages && galleryImages.length > 0 
    ? [mainImage, ...galleryImages].filter(Boolean) as string[]
    : [mainImage || "/placeholder.png"];

  return (
    <div className="flex flex-col gap-4">
      {/* IMAGEN GRANDE PRINCIPAL */}
      <div className="w-full aspect-[4/3] md:aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative shadow-sm">
        <img 
          src={activeImage} 
          alt="Vista principal del auto" 
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
        />
      </div>

      {/* CARRUSEL DE MINIATURAS (Scroll horizontal) */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {allImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setActiveImage(img)}
            className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              activeImage === img ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent opacity-70 hover:opacity-100"
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