"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { proyectos } from "@/data/lavilet/proyectos";
import { obtenerPromedioMercado, calcularPrecioM2, calcularDiferenciaVsMercado, clasificarPrecio } from "@/lib/lavilet/calculos";
import { Calculator } from "lucide-react";

export function Simulador() {
  const lavilet = proyectos.find(p => p.destacado)!;
  const promedioMercado = obtenerPromedioMercado(proyectos);
  
  const [precioSimulado, setPrecioSimulado] = useState(lavilet.precio);
  
  const precioM2Simulado = calcularPrecioM2(precioSimulado, lavilet.areaInterna);
  const diferencia = calcularDiferenciaVsMercado(precioM2Simulado, promedioMercado);
  const clasificacion = clasificarPrecio(precioM2Simulado, promedioMercado);

  const getClasificacionColor = (clas: string) => {
    switch (clas) {
      case "Económico": return "text-sky-600 bg-sky-100 border-sky-200";
      case "Premium": return "text-[#c48b5d] bg-[#c48b5d]/10 border-[#c48b5d]/20";
      default: return "text-slate-600 bg-slate-100 border-slate-200";
    }
  };

  return (
    <section className="py-24 bg-[#faf8f5] text-slate-900 relative overflow-hidden">
      {/* Decorative lines */}
      <div className="absolute top-0 left-10 w-px h-full bg-slate-200/50" />
      <div className="absolute top-0 right-10 w-px h-full bg-slate-200/50" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center justify-center gap-4 mb-16 text-center">
          <Calculator className="w-8 h-8 text-[#c48b5d]" />
          <h2 className="text-3xl md:text-5xl font-light tracking-tight uppercase">
            Simulador de <span className="font-bold text-[#c48b5d]">Valoración</span>
          </h2>
          <div className="w-24 h-1 bg-[#c48b5d] rounded-full mt-2" />
        </div>

        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c48b5d] to-transparent opacity-50" />
          
          <div className="mb-12">
            <div className="flex justify-between items-end mb-6">
              <label className="text-slate-500 font-light tracking-widest uppercase text-sm">Precio Total (USD)</label>
              <span className="text-4xl md:text-5xl font-light tracking-tighter text-slate-900">${precioSimulado.toLocaleString()}</span>
            </div>
            
            <input 
              type="range" 
              min="150000" 
              max="300000" 
              step="1000"
              value={precioSimulado}
              onChange={(e) => setPrecioSimulado(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#c48b5d] focus:outline-none focus:ring-2 focus:ring-[#c48b5d]/50"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-4 font-light tracking-widest uppercase">
              <span>$150k</span>
              <span>$300k</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-slate-200">
            <div>
              <p className="text-slate-500 text-xs mb-2 font-light tracking-widest uppercase">Precio por m²</p>
              <p className="text-3xl font-light tracking-tighter text-slate-900">${Math.round(precioM2Simulado).toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-slate-500 text-xs mb-2 font-light tracking-widest uppercase">Vs. Mercado</p>
              <p className="text-3xl font-light tracking-tighter flex items-center gap-2 text-slate-900">
                {diferencia > 0 ? '+' : ''}{diferencia.toFixed(1)}%
              </p>
            </div>
            
            <div>
              <p className="text-slate-500 text-xs mb-3 font-light tracking-widest uppercase">Posicionamiento</p>
              <span className={`inline-flex px-4 py-1.5 rounded-full text-xs font-light tracking-widest uppercase border ${getClasificacionColor(clasificacion)}`}>
                {clasificacion}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
