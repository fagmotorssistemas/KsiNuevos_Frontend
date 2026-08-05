"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Proyecto } from "@/data/lavilet/proyectos";
import { calcularPrecioM2 } from "@/lib/lavilet/calculos";
import { MapPin, Building2, Home, Key, DoorOpen, LayoutDashboard, Swords, ExternalLink } from "lucide-react";

interface TablaComparativaProps {
  proyectos: Proyecto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
}

// Asignamos un icono razonable relacionado con bienes raíces
const getIconForIndex = (index: number) => {
  const icons = [Building2, Home, Key, DoorOpen, LayoutDashboard, MapPin];
  const Icon = icons[index % icons.length];
  return <Icon className="w-6 h-6" strokeWidth={1.5} />;
};

export function TablaComparativa({ proyectos, selectedId, onSelect, onCompare }: TablaComparativaProps) {
  // Ordenar: primero Lavilet, luego el resto por precio/m2
  const proyectosOrdenados = [...proyectos].sort((a, b) => {
    if (a.destacado) return -1;
    if (b.destacado) return 1;
    return calcularPrecioM2(b.precio, b.areaInterna) - calcularPrecioM2(a.precio, a.areaInterna);
  });

  return (
    <div className="relative w-full h-full">
      <div className="mb-12">
        <h3 className="text-2xl font-medium tracking-widest text-slate-900 uppercase">Proyectos</h3>
        <div className="w-12 h-0.5 bg-[#c48b5d] mt-2 mb-4" />
        <p className="text-sm text-slate-600 font-medium tracking-wide">
          Análisis detallado de especificaciones técnicas por desarrollo inmobiliario.
        </p>
      </div>

      <div className="relative pl-8 md:pl-12">
        {/* Línea vertical principal (Timeline) */}
        <div className="absolute left-3 md:left-5 top-2 bottom-4 w-px bg-slate-300" />

        {proyectosOrdenados.map((proyecto, idx) => {
          const isSelected = selectedId === proyecto.id;
          const precioM2 = calcularPrecioM2(proyecto.precio, proyecto.areaInterna);
          
          return (
            <div key={proyecto.id} className="relative mb-10 group">
              {/* Nodo (Punto en la línea) */}
              <div 
                className={`absolute -left-[25px] md:-left-[33px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-[#faf8f5] transition-colors duration-300 z-10 ${
                  isSelected || proyecto.destacado ? 'border-[#c48b5d] shadow-[0_0_10px_rgba(196,139,93,0.4)]' : 'border-slate-300 group-hover:border-slate-400'
                }`} 
              />
              
              {/* Línea conectora horizontal */}
              <div 
                className={`absolute -left-[12px] md:-left-[20px] top-5 h-px transition-all duration-300 ${
                  isSelected || proyecto.destacado ? 'w-6 bg-[#c48b5d]' : 'w-4 bg-slate-300 group-hover:bg-slate-400 group-hover:w-6'
                }`} 
              />

              {/* Botón / Cabecera del bloque */}
              <button
                onClick={() => onSelect(proyecto.id)}
                className="w-full text-left focus:outline-none"
              >
                <div className={`flex items-start gap-4 transition-all duration-300 opacity-100`}>
                  <div className={`mt-1 ${proyecto.destacado ? 'text-[#c48b5d]' : 'text-slate-400'}`}>
                    {getIconForIndex(idx)}
                  </div>
                  <div>
                    <h4 className="text-xs tracking-widest text-slate-500 uppercase mb-1 font-medium">
                      STEP 0{idx + 1}
                    </h4>
                    <h3 className={`text-xl font-medium uppercase tracking-wider ${proyecto.destacado ? 'text-[#c48b5d]' : 'text-slate-900'}`}>
                      {proyecto.nombre}
                    </h3>
                  </div>
                </div>
              </button>

              {/* Contenido expandible estilo caja técnica */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="border-t border-l border-slate-200 p-5 bg-white relative shadow-sm rounded-br-xl">
                      {/* Esquinas decorativas */}
                      <div className="absolute top-0 left-0 w-2 h-px bg-[#c48b5d]" />
                      <div className="absolute top-0 left-0 w-px h-2 bg-[#c48b5d]" />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 mb-4">
                        <div>
                          <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-1">Precio Total</p>
                          <p className="text-lg text-slate-900 font-semibold tracking-wide">
                            {proyecto.destacado ? "POR VER" : `$${proyecto.precio.toLocaleString()}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-1">Área Interna</p>
                          <p className="text-lg text-slate-900 font-semibold tracking-wide">
                            {proyecto.destacado ? "POR VER" : `${proyecto.areaInterna} m²`}
                          </p>
                        </div>
                        {proyecto.areaTotal && (
                          <>
                            <div>
                              <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-1">Área Total</p>
                              <p className="text-lg text-slate-900 font-semibold tracking-wide">{proyecto.areaTotal} m²</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-1">Precio/m² (Total)</p>
                              <p className="text-lg text-slate-900 font-semibold tracking-wide">${Math.round(proyecto.precio / proyecto.areaTotal).toLocaleString()}</p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="col-span-2 md:col-span-4">
                        <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-2">Especificaciones</p>
                        <div className="flex flex-wrap gap-2">
                          {proyecto.terraza && (
                            <span className="px-2 py-1 border border-slate-200 bg-white text-xs font-medium tracking-widest text-slate-700 uppercase">
                              Terraza
                            </span>
                          )}
                          {proyecto.amenidades.map((amenidad, i) => (
                            <span key={i} className="px-2 py-1 border border-slate-200 bg-white text-xs font-medium tracking-widest text-slate-700 uppercase">
                              {amenidad}
                            </span>
                          ))}
                          {!proyecto.terraza && proyecto.amenidades.length === 0 && (
                            <span className="text-slate-400 italic font-medium text-xs">N/A</span>
                          )}
                        </div>
                      </div>

                      {/* Footer de la tarjeta: Fuente y Botón de Comparación */}
                      {(!proyecto.destacado || proyecto.fuenteUrl) && (
                        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                          {proyecto.fuenteUrl ? (
                            <a 
                              href={proyecto.fuenteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-slate-400 hover:text-[#c48b5d] transition-colors flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="underline underline-offset-2">Ver fuente de datos</span>
                            </a>
                          ) : (
                            <div />
                          )}

                          {!proyecto.destacado && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompare(proyecto.id);
                              }}
                              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full text-xs font-medium tracking-widest uppercase hover:bg-[#c48b5d] transition-colors shadow-md ml-auto"
                            >
                              <Swords className="w-4 h-4" />
                              <span>Ver Análisis vs Lavilet</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
