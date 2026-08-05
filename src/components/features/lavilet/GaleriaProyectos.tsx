"use client";

import { useRef, useEffect } from "react";
import { Proyecto } from "@/data/lavilet/proyectos";
import { motion } from "framer-motion";
import Image from "next/image";
import { MapPin } from "lucide-react";

interface GaleriaProyectosProps {
  proyectos: Proyecto[];
  selectedId: string | null;
}

export function GaleriaProyectos({ proyectos, selectedId }: GaleriaProyectosProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Ordenar para que el proyecto destacado (Lavilet) aparezca primero en la galería,
  // y el resto de mayor a menor precio por metro cuadrado.
  const proyectosOrdenados = [...proyectos].sort((a, b) => {
    if (a.destacado) return -1;
    if (b.destacado) return 1;
    
    const precioM2A = a.precio / a.areaInterna;
    const precioM2B = b.precio / b.areaInterna;
    
    return precioM2B - precioM2A;
  });

  useEffect(() => {
    if (selectedId && containerRef.current) {
      const element = document.getElementById(`proyecto-detalle-${selectedId}`);
      if (element) {
        // Scroll smoothly to the element
        const yOffset = -100; // Offset for fixed headers if any
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }, [selectedId]);

  return (
    <section className="py-24 bg-[#faf8f5] relative" ref={containerRef}>
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-medium tracking-widest text-slate-900 uppercase mb-4">
            Galería de Proyectos
          </h2>
          <div className="w-16 h-0.5 bg-[#c48b5d] mx-auto mb-6" />
          <p className="text-slate-600 max-w-2xl mx-auto font-light">
            Explora en detalle cada uno de los desarrollos inmobiliarios analizados en la zona.
          </p>
        </div>

        <div className="space-y-32">
          {proyectosOrdenados.map((proyecto, index) => {
            const isSelected = selectedId === proyecto.id;
            
            // --- DISEÑO PARA EL PROYECTO PRINCIPAL (LAVILET) ---
            if (proyecto.destacado) {
              return (
                <div 
                  key={proyecto.id} 
                  id={`proyecto-detalle-${proyecto.id}`}
                  className={`flex flex-col gap-10 items-center transition-all duration-700 ${isSelected ? 'opacity-100 scale-100' : 'opacity-95 scale-[0.99]'} pb-16 border-b border-slate-200`}
                >
                  <div className="w-full text-center space-y-4 mb-4">
                    <span className="inline-block px-4 py-1.5 bg-[#c48b5d] text-white text-xs font-semibold tracking-widest uppercase rounded-sm shadow-md">
                      Nuestro Proyecto
                    </span>
                    <h4 className="text-5xl md:text-7xl font-medium text-slate-900 uppercase tracking-wider">
                      {proyecto.nombre}
                    </h4>
                    <div className="flex items-center justify-center gap-4 text-slate-500 font-medium tracking-wide">
                      <span>{proyecto.zona}</span>
                      {proyecto.ubicacionUrl && (
                        <>
                          <span>•</span>
                          <a 
                            href={proyecto.ubicacionUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 hover:text-[#c48b5d] transition-colors"
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Ver mapa</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`relative aspect-video md:aspect-[21/9] w-full overflow-hidden rounded-sm transition-all duration-700 shadow-2xl shadow-[#c48b5d]/10 ring-1 ring-[#c48b5d]/20`}>
                    {proyecto.imagen ? (
                      <Image 
                        src={proyecto.imagen} 
                        alt={proyecto.nombre}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-1000"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <span className="text-slate-400 tracking-widest uppercase text-sm font-medium">Imagen no disponible</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 text-center pt-8">
                    <div className="p-8 bg-white shadow-sm border border-slate-100 rounded-sm relative overflow-hidden group hover:border-[#c48b5d]/30 transition-colors">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#c48b5d] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <p className="text-4xl md:text-5xl font-light text-slate-900 mb-3">
                        POR VER
                      </p>
                      <p className="text-sm text-slate-500 uppercase tracking-widest font-medium">Precio por m²</p>
                    </div>
                    <div className="p-8 bg-white shadow-sm border border-slate-100 rounded-sm relative overflow-hidden group hover:border-[#c48b5d]/30 transition-colors">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#c48b5d] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <p className="text-4xl md:text-5xl font-light text-slate-900 mb-3">
                        POR VER
                      </p>
                      <p className="text-sm text-slate-500 uppercase tracking-widest font-medium">Área Total</p>
                    </div>
                    <div className="p-8 bg-white shadow-sm border border-slate-100 rounded-sm relative overflow-hidden group hover:border-[#c48b5d]/30 transition-colors">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#c48b5d] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <p className="text-4xl md:text-5xl font-light text-slate-900 mb-3">
                        POR VER
                      </p>
                      <p className="text-sm text-slate-500 uppercase tracking-widest font-medium">Precio Total</p>
                    </div>
                  </div>
                  
                  <div className="w-full max-w-3xl text-center mt-4">
                    <p className="text-slate-600 leading-relaxed font-light text-xl">
                      {proyecto.nombre} es nuestro desarrollo inmobiliario insignia. 
                      Ofrece un estilo de vida superior en {proyecto.zona}.
                      {proyecto.terraza ? " Incluye terraza privada y amenidades exclusivas." : ""}
                    </p>
                  </div>
                </div>
              );
            }

            // --- DISEÑO PARA LOS PROYECTOS DE COMPARACIÓN ---
            // Restamos 1 al index para el cálculo de par/impar porque Lavilet siempre es el primero
            const isEven = (index - 1) % 2 === 0;
            
            return (
              <div 
                key={proyecto.id} 
                id={`proyecto-detalle-${proyecto.id}`}
                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-16 items-center transition-all duration-700 ${isSelected ? 'opacity-100 scale-100' : 'opacity-90 scale-[0.98]'}`}
              >
                {/* Text Content */}
                <div className="w-full lg:w-1/2 space-y-8">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-sm tracking-widest text-[#c48b5d] uppercase font-medium">
                        {proyecto.zona}
                      </h3>
                      {proyecto.ubicacionUrl && (
                        <a 
                          href={proyecto.ubicacionUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#c48b5d] transition-colors uppercase tracking-widest"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Ver mapa</span>
                        </a>
                      )}
                    </div>
                    <h4 className="text-4xl md:text-5xl font-light text-slate-900 uppercase tracking-wider">
                      {proyecto.nombre}
                    </h4>
                    {proyecto.direccion && (
                      <p className="text-sm text-slate-500 font-medium tracking-wide mt-3">
                        {proyecto.direccion}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-slate-600 leading-relaxed font-light text-lg">
                    Desarrollo inmobiliario con un área interna de {proyecto.areaInterna} m², 
                    ofreciendo un precio total de ${proyecto.precio.toLocaleString()}.
                    {proyecto.terraza ? " Incluye terraza privada." : ""}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                    <div>
                      <p className="text-3xl font-light text-slate-900">
                        ${Math.round(proyecto.precio / proyecto.areaInterna).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mt-2 font-medium">Precio por m²</p>
                    </div>
                    <div>
                      <p className="text-3xl font-light text-slate-900">
                        {proyecto.areaInterna} <span className="text-xl">m²</span>
                      </p>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mt-2 font-medium">Área Total</p>
                    </div>
                  </div>
                </div>

                {/* Image Content */}
                <div className="w-full lg:w-1/2">
                  <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-sm transition-all duration-700 ${isSelected ? 'shadow-2xl shadow-[#c48b5d]/20 ring-1 ring-[#c48b5d]/30' : 'shadow-lg'}`}>
                    {proyecto.imagen ? (
                      <Image 
                        src={proyecto.imagen} 
                        alt={proyecto.nombre}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-1000"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <span className="text-slate-400 tracking-widest uppercase text-sm font-medium">Imagen no disponible</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
