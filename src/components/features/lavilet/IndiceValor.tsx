"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";

export function IndiceValor() {
  const [showMetodologia, setShowMetodologia] = useState(false);

  const factores = [
    { nombre: "Ubicación (Puertas del Sol)", peso: "35%", valor: "Premium" },
    { nombre: "Amenidades Exclusivas", peso: "25%", valor: "Alto" },
    { nombre: "Diseño y Acabados", peso: "20%", valor: "Premium" },
    { nombre: "Áreas Abiertas (Terrazas)", peso: "20%", valor: "Muy Alto" },
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Decorative lines like infographic */}
      <div className="absolute top-0 left-10 w-px h-full bg-slate-200/50" />
      <div className="absolute top-0 right-10 w-px h-full bg-slate-200/50" />
      <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200/50" />

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-light tracking-tight text-slate-900 mb-4 uppercase">
            Índice de <span className="font-bold text-[#c48b5d]">Valor Agregado</span>
          </h2>
          <div className="w-24 h-1 bg-[#c48b5d] mx-auto mb-6 rounded-full" />
          <p className="text-slate-600 font-light tracking-wide">
            El precio de Lavilet no solo refleja metros cuadrados, sino un estilo de vida.
          </p>
        </div>

        <div className="bg-[#faf8f5] rounded-3xl p-10 border border-slate-200 text-center mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c48b5d] to-transparent opacity-50" />
          
          <div className="text-6xl md:text-7xl font-light text-[#c48b5d] mb-2 tracking-tighter">
            9.2<span className="text-3xl text-slate-400 font-light">/10</span>
          </div>
          <p className="text-slate-600 font-light tracking-widest uppercase text-sm">Puntaje de Valor Percibido</p>
          
          <button 
            onClick={() => setShowMetodologia(!showMetodologia)}
            className="mt-8 inline-flex items-center gap-2 text-xs font-light tracking-widest uppercase text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 px-6 py-2.5 rounded-full hover:bg-slate-100"
          >
            <Info className="w-4 h-4" />
            {showMetodologia ? "Ocultar metodología" : "Ver metodología"}
          </button>
        </div>

        <AnimatePresence>
          {showMetodologia && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-8">
                {factores.map((factor, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex justify-between items-center group hover:border-[#c48b5d]/30 transition-colors">
                    <div>
                      <p className="font-light tracking-wide text-slate-800 mb-1">{factor.nombre}</p>
                      <p className="text-xs text-slate-500 font-light tracking-widest uppercase">Peso: {factor.peso}</p>
                    </div>
                    <span className="px-4 py-1.5 bg-[#c48b5d]/10 border border-[#c48b5d]/20 text-[#c48b5d] text-xs font-light tracking-wider uppercase rounded-full">
                      {factor.valor}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
