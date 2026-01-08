import React from 'react';

// Definimos los nuevos datos con tus imágenes locales
const CAR_TYPES = [
  { 
    label: 'Sedán', 
    img: '/CarImages/Sedan.png' 
  },
  { 
    label: 'SUV', 
    img: '/CarImages/Suv.png' 
  },
  { 
    label: 'Pick-up', 
    img: '/CarImages/Pickup.png' 
  },
  { 
    label: 'Hatchback', 
    img: '/CarImages/hatchback.png' 
  },
  { 
    label: 'Deportivo', 
    img: '/CarImages/Deportivo.png' 
  },
  { 
    label: 'Coupé', 
    img: '/CarImages/Coupe.png' 
  },
  { 
    label: 'Minivan', 
    img: '/CarImages/Minivan.png' 
  },
  { 
    label: 'Camioneta', 
    img: '/CarImages/Camioneta.png' 
  },
  { 
    label: 'Doble Cabina', 
    img: '/CarImages/DobleCabina.png' 
  }
];

export const LifestyleSection = () => (
  // Nota: Como ahora son 9 elementos, grid-cols-5 dejará 4 elementos abajo. 
  // Se ve bien, pero podrías considerar cambiar a grid-cols-3 o grid-cols-4 en pantallas medianas si prefieres otra distribución.
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
    {CAR_TYPES.map((type) => (
      <button 
        key={type.label} 
        className="p-6 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center hover:border-red-600 hover:shadow-lg transition-all duration-300 group"
      >
        {/* Contenedor de la imagen */}
        <div className="h-16 w-full mb-3 flex items-center justify-center">
          <img 
            src={type.img} 
            alt={type.label} 
            className="h-full w-auto object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" 
          />
        </div>
        
        <span className="font-bold text-sm text-slate-600 group-hover:text-red-600 transition-colors">
          {type.label}
        </span>
      </button>
    ))}
  </div>
);