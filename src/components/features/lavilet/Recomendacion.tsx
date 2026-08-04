"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export function Recomendacion() {
  return (
    <section className="py-32 bg-white relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c48b5d]/30 to-transparent" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#c48b5d]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-10 w-px h-full bg-slate-200/50" />
      <div className="absolute bottom-0 right-10 w-px h-full bg-slate-200/50" />
      
      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-[#faf8f5] rounded-3xl p-10 md:p-14 shadow-sm border border-slate-200 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c48b5d] to-transparent opacity-50" />
          
          <div className="w-16 h-16 bg-[#c48b5d]/10 border border-[#c48b5d]/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-8 h-8 text-[#c48b5d]" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 mb-6 uppercase">
            Conclusión <span className="font-bold text-[#c48b5d]">Estratégica</span>
          </h2>
          
          <p className="text-lg text-slate-600 font-light mb-10 leading-relaxed tracking-wide">
            Para superar la barrera de los $200.000 y competir directamente con todos los proyectos del sector (La Maison, Áger V, Kira II y Samaní), Lavilet justifica su posicionamiento <strong className="text-slate-900 font-medium">Premium</strong> gracias a sus características exclusivas y ubicación prime.
          </p>

          <div className="bg-white rounded-2xl p-8 md:p-10 border border-slate-200 inline-block w-full shadow-sm">
            <p className="text-xs text-[#c48b5d] font-medium mb-3 uppercase tracking-widest">Media Mínima Competitiva del Sector</p>
            <p className="text-4xl md:text-5xl font-light text-slate-900 tracking-tighter mb-8">
              $2,330 <span className="text-2xl text-slate-400 font-light">/ m²</span>
            </p>
            <div className="w-24 h-px bg-slate-200 mx-auto mb-8" />
            <p className="text-slate-700 font-medium leading-relaxed text-lg md:text-xl max-w-2xl mx-auto">
              "Lavilet es un proyecto que debe ser evaluado no solo por sus metros cuadrados, sino por todos sus commodities, su ubicación y su gran eje comercial de dos plantas, único en el sector."
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
