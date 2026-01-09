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
    <div className="mb-6 border-b border-gray-100 pb-6">
      {/* Marca y Modelo */}
      <div className="flex flex-wrap items-baseline gap-2 mb-2">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">
          {brand} {model}
        </h1>
        <span className="text-xl text-gray-500 font-medium">{year}</span>
      </div>

      {/* Versión (si existe) */}
      {version && (
        <p className="text-gray-500 font-medium text-sm mb-4 bg-gray-100 inline-block px-3 py-1 rounded-full">
          {version}
        </p>
      )}

      {/* Precio */}
      <div className="mt-4">
        <p className="text-sm text-gray-500 font-medium mb-1">Precio de contado</p>
        <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-blue-600">
            ${price?.toLocaleString()}
            </span>
        </div>
      </div>

      {/* Datos rápidos (Km y Ciudad) */}
      <div className="flex items-center gap-4 mt-6 text-sm text-gray-600 font-medium">
        <div className="flex items-center gap-1.5">
            {/* Icono simple de velocímetro (SVG) */}
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {mileage?.toLocaleString() || 0} km
        </div>
        
        {city && (
            <div className="flex items-center gap-1.5">
                {/* Icono simple de ubicación (SVG) */}
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {city}
            </div>
        )}
      </div>
    </div>
  );
};