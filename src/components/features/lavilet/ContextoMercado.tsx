"use client";

import { motion } from "framer-motion";
import { proyectos } from "@/data/lavilet/proyectos";
import { obtenerPromedioMercado } from "@/lib/lavilet/calculos";

export function ContextoMercado() {
  const promedioMercado = obtenerPromedioMercado(proyectos);
  const proyectosMercado = proyectos.filter(p => !p.destacado).length;

  const kpis = [
    {
      label: "Proyectos Analizados",
      value: proyectosMercado,
      suffix: " en la zona",
    },
    {
      label: "Promedio Mercado",
      value: `$${Math.round(promedioMercado).toLocaleString()}`,
      suffix: " por m²",
    },
    {
      label: "Competidor Directo",
      value: "La Maison",
      suffix: "$2,529 por m²",
    }
  ];

  return (
    <section id="contexto-mercado" className="py-24 bg-[#faf8f5] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-10 w-px h-full bg-slate-200/50" />
      <div className="absolute top-0 right-10 w-px h-full bg-slate-200/50" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-light tracking-tight text-slate-900 mb-4 uppercase">
            Contexto de <span className="font-bold text-[#c48b5d]">Mercado</span>
          </h2>
          <div className="w-24 h-1 bg-[#c48b5d] mx-auto mb-6 rounded-full" />
          <p className="text-slate-600 max-w-2xl mx-auto font-light tracking-wide">
            Hemos analizado los principales proyectos inmobiliarios en desarrollo dentro de la misma zona para establecer una línea base objetiva.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {kpis.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
              className="bg-white/60 backdrop-blur-sm rounded-3xl p-10 border border-slate-200 shadow-sm text-center relative group hover:shadow-md hover:border-[#c48b5d]/30 transition-all"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-[#c48b5d]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <h3 className="text-slate-500 font-light tracking-widest uppercase text-xs mb-4">{kpi.label}</h3>
              <div className="text-4xl md:text-5xl font-light text-slate-900 mb-3 tracking-tighter">
                {kpi.value}
              </div>
              <p className="text-xs text-slate-400 font-light tracking-widest uppercase">{kpi.suffix}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
