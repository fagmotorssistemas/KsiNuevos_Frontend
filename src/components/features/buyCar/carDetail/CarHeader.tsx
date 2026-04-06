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

      {/* Botón WhatsApp */}
      <div className="mt-8">
        <a 
          href={`https://wa.me/593983335555?text=${encodeURIComponent(`Hola, estoy interesado en el ${brand} ${model} ${year} que vi en la página web.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.23)] bg-[#25D366] text-white hover:bg-[#128C7E] active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Hablar con alguien
        </a>
      </div>
    </div>
  );
};