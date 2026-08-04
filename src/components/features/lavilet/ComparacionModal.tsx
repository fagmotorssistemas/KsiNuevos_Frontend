"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, XCircle, Scale, Building2 } from "lucide-react";

interface ComparacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyectoId: string | null;
}

const comparisonData: Record<string, any> = {
  ager: {
    competitorName: "Áger V",
    competitorPoints: [
      "Precio promedio de $1.992/m² — tocando los $2.000",
      "Sin piscina",
      "Sin gimnasio",
      "Sin seguridad 24h confirmada",
      "Sin áreas comunales diferenciadas",
      "Producto genérico, no premium"
    ],
    laviletPoints: [
      "POR VER",
      "Con piscina",
      "Con gimnasio",
      "Con seguridad 24h",
      "Con áreas comunales premium",
      "Producto diferenciado, no solo m² construidos"
    ],
    conclusion: "El mercado ya paga casi $2.000/m² por un edificio sin amenidades — la diferencia con Lavilet no es capricho, es lo que Áger V no ofrece."
  },
  kira: {
    competitorName: "Kira II",
    competitorPoints: [
      "Precio de $2.200/m²",
      "Sin piscina ni áreas húmedas",
      "Sin áreas verdes extensas",
      "Acabados estándar",
      "Diseño convencional",
      "Amenidades básicas"
    ],
    laviletPoints: [
      "POR VER",
      "Con piscina y áreas húmedas",
      "Jardines y paisajismo premium",
      "Acabados de lujo importados",
      "Arquitectura de vanguardia",
      "Amenidades exclusivas completas"
    ],
    conclusion: "Kira II alcanza los $2.200/m² ofreciendo amenidades básicas y sin piscina. Lavilet justifica su valor al incluir áreas húmedas, acabados de lujo y un diseño de vanguardia."
  },
  samani: {
    competitorName: "Samaní",
    competitorPoints: [
      "Precio de $2.025/m²",
      "Cuenta con rooftop y área comercial",
      "Sin piscina",
      "Espacios comunes reducidos",
      "Enfoque en densidad",
      "Materiales locales estándar"
    ],
    laviletPoints: [
      "POR VER",
      "Diseño residencial exclusivo sin comercio",
      "Con piscina y áreas húmedas",
      "Club house y áreas sociales amplias",
      "Enfoque en calidad de vida y privacidad",
      "Materiales de alta gama"
    ],
    conclusion: "Samaní ofrece un concepto mixto con área comercial a $2.025/m². Lavilet apuesta por la exclusividad, privacidad y amenidades de lujo como piscina, justificando su propuesta de valor."
  },
  lamaison: {
    competitorName: "La Maison",
    competitorPoints: [
      "Precio premium de $2.769/m²",
      "Con piscina",
      "Con parqueadero",
      "Gimnasio básico",
      "Diseño clásico",
      "Menor área de terrazas"
    ],
    laviletPoints: [
      "POR VER",
      "Piscina premium y áreas húmedas",
      "Parqueaderos amplios y seguros",
      "Gimnasio de última generación",
      "Diseño moderno y disruptivo",
      "Terrazas amplias y funcionales"
    ],
    conclusion: "Aunque La Maison cuenta con amenidades similares, su precio de $2.769/m² es considerablemente superior. Lavilet ofrece mejores acabados y diseño por un valor más competitivo."
  }
};

export function ComparacionModal({ isOpen, onClose, proyectoId }: ComparacionModalProps) {
  if (!isOpen || !proyectoId || proyectoId === 'lavilet') return null;

  const data = comparisonData[proyectoId] || comparisonData['ager']; // Fallback to ager structure if not found

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#c48b5d]/10 flex items-center justify-center text-[#c48b5d]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium tracking-widest text-[#c48b5d] uppercase">Análisis Competitivo</h3>
                  <h2 className="text-xl font-semibold text-slate-900">{data.competitorName} vs Lavilet</h2>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Timeline Comparison */}
            <div className="p-6 sm:p-10">
              <div className="relative">
                {/* Center Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2 hidden md:block" />
                
                {/* Column Headers */}
                <div className="flex justify-between mb-12 relative z-10">
                  <div className="w-full md:w-[45%] text-center md:text-right bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <Building2 className="w-6 h-6 text-slate-400 mx-auto md:ml-auto md:mr-0 mb-2" />
                    <h4 className="text-lg font-medium text-slate-700 uppercase tracking-wider">{data.competitorName}</h4>
                  </div>
                  <div className="w-full md:w-[45%] text-center md:text-left bg-[#c48b5d]/5 p-4 rounded-xl border border-[#c48b5d]/20 mt-4 md:mt-0">
                    <div className="w-6 h-6 rounded-full bg-[#c48b5d] text-white flex items-center justify-center mx-auto md:mr-auto md:ml-0 mb-2 shadow-sm">
                      <span className="text-xs font-bold">V</span>
                    </div>
                    <h4 className="text-lg font-semibold text-[#c48b5d] uppercase tracking-wider">Lavilet</h4>
                  </div>
                </div>

                {/* Comparison Points */}
                <div className="space-y-8 md:space-y-12">
                  {data.competitorPoints.map((point: string, i: number) => (
                    <div key={i} className="flex flex-col md:flex-row items-center justify-between w-full relative">
                      
                      {/* Competitor Point */}
                      <div className="w-full md:w-[45%] text-center md:text-right md:pr-8 mb-4 md:mb-0 order-2 md:order-1">
                        <p className="text-sm md:text-base text-slate-600 leading-relaxed">{point}</p>
                      </div>
                      
                      {/* Center Bubbles */}
                      <div className="relative md:absolute left-1/2 md:-translate-x-1/2 flex items-center justify-center gap-3 bg-white px-3 py-2 rounded-full border border-slate-200 shadow-sm z-10 order-1 md:order-2 mb-4 md:mb-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <XCircle className="w-4 h-4" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#c48b5d]/10 flex items-center justify-center text-[#c48b5d]">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                      
                      {/* Lavilet Point */}
                      <div className="w-full md:w-[45%] text-center md:text-left md:pl-8 order-3">
                        <p className="text-sm md:text-base text-slate-900 font-medium leading-relaxed">{data.laviletPoints[i]}</p>
                      </div>
                      
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Conclusion */}
            <div className="bg-slate-900 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#c48b5d]" />
              <p className="text-white/90 text-lg md:text-xl font-light leading-relaxed text-center max-w-3xl mx-auto">
                "{data.conclusion}"
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
