import React, { useState, useEffect, useMemo } from "react";

interface CarGalleryProps {
  mainImage: string | null;
  galleryImages?: string[] | null; 
}

export const CarGallery = ({ mainImage, galleryImages }: CarGalleryProps) => {
  // 1. Estado inicial
  const [activeImage, setActiveImage] = useState(mainImage || "/placeholder.png");

  // 2. Sincronizar estado cuando cambia el prop
  useEffect(() => {
    if (mainImage) {
      setActiveImage(mainImage);
    }
  }, [mainImage]);

  // 3. Crear lista de imágenes única
  const allImages = useMemo(() => {
    const rawList = [mainImage, ...(galleryImages || [])];
    const cleanList = rawList.filter(Boolean) as string[];
    return Array.from(new Set(cleanList));
  }, [mainImage, galleryImages]);

  return (
    <div className="flex flex-col gap-4">
      {/* IMAGEN GRANDE PRINCIPAL 
          CAMBIOS REALIZADOS:
          1. Eliminé 'aspect-[4/3]' y 'md:aspect-[16/9]'. Esto quitó la restricción de altura.
          2. La imagen ahora dicta la altura del contenedor.
      */}
      <div className="w-full bg-neutral-100 rounded-3xl overflow-hidden border border-neutral-200 relative shadow-sm group">
        <img 
          src={activeImage} 
          alt="Vista principal del auto" 
          /* CAMBIOS EN LA IMAGEN:
             1. 'w-full': Ocupa todo el ancho disponible.
             2. 'h-auto': La altura se calcula sola para mantener la proporción (efecto Shift).
             3. Eliminé 'object-cover' porque ya no estamos recortando, estamos mostrando todo.
             4. Agregué 'block' para evitar espacios fantasma debajo de la imagen.
          */
          className="w-full h-auto block group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </div>

      {/* CARRUSEL DE MINIATURAS */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide pt-2 px-1">
        {allImages.map((img, idx) => (
          <button
            key={`${img}-${idx}`}
            onClick={() => setActiveImage(img)}
            className={`flex-shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 relative ${
              activeImage === img 
                ? "border-red-600 ring-2 ring-red-100 scale-105 opacity-100 z-10 shadow-md" 
                : "border-transparent opacity-60 hover:opacity-100 hover:border-neutral-300"
            }`}
          >
            {/* Las miniaturas las dejamos con object-cover para que se vean uniformes en la tira */}
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