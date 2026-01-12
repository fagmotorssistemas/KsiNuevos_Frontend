import React from "react";

interface CarHeaderProps {
  brand: string;
  model: string;
  version?: string | null;
  year: number;
  price: number;
  mileage?: number | null;
  city?: string | null;
}

export const CarHeader = ({ brand, model, version, year, price, mileage, city }: CarHeaderProps) => {
  return (
    <div className="mb-6 border-b border-neutral-200 pb-6">
      {/* Marca y Modelo */}
      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <h1 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter">
          {brand} {model}
        </h1>
        {/* Año destacado en rojo */}
        <span className="text-2xl font-bold text-red-600 tracking-tight">{year}</span>
      </div>

      {/* Versión (si existe) - Estilo Badge Neutro */}
      {version && (
        <p className="inline-block px-4 py-1 bg-neutral-100 border border-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded-full mb-6">
          {version}
        </p>
      )}

      {/* Precio */}
      <div className="mt-2">
        <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-1">Precio de contado</p>
        <div className="flex items-center gap-3">
            <span className="text-5xl font-black text-black tracking-tighter">
            ${price?.toLocaleString()}
            </span>
        </div>
      </div>

      {/* Datos rápidos (Km y Ciudad) */}
      <div className="flex items-center gap-6 mt-8 text-sm font-bold text-neutral-600">
        <div className="flex items-center gap-2 group">
            {/* Icono Rojo */}
            <svg className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {mileage?.toLocaleString() || 0} km
        </div>
        
        {city && (
            <div className="flex items-center gap-2 group">
                <svg className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="capitalize">{city}</span>
            </div>
        )}
      </div>
    </div>
  );
};