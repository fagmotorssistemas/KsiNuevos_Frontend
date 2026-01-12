import React from 'react';

export const TeamSection = () => (
  // CAMBIO:
  // 1. justify-between: Pega las tarjetas a los extremos y distribuye el espacio interno.
  // 2. w-full: Asegura que el contenedor ocupe todo el ancho para que el space-between funcione.
  // 3. gap-y-8: Solo dejamos espacio vertical por si bajan a otra línea en móviles.
  <div className="flex flex-wrap justify-evenly gap-y-8 w-full">
    {[1, 2, 3].map((i) => (
      <div 
        key={i} 
        className="group relative flex flex-col bg-black border border-neutral-800 hover:border-red-600 transition-colors duration-300 p-4 rounded-2xl aspect-[3/4] w-full max-w-[260px]"
      >
        
        {/* Imagen Cuadrada */}
        <div className="w-full aspect-square mb-4 overflow-hidden rounded-xl bg-neutral-900">
          <img 
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300" 
            alt="Team" 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
          />
        </div>

        {/* Contenido */}
        <div className="flex-grow flex flex-col justify-end text-left">
            <h4 className="font-bold text-white text-lg mb-1">
                Staff K-si {i}
            </h4>
            <p className="text-neutral-400 text-[10px] uppercase tracking-widest font-medium">
                Asesor Comercial
            </p>
            
            <div className="w-8 h-0.5 bg-red-600 mt-3 group-hover:w-full transition-all duration-500"></div>
        </div>
      </div>
    ))}
  </div>
);