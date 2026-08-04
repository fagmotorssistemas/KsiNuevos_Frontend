"use client";

import { motion } from "framer-motion";

export function Hero() {
  const handleScroll = () => {
    const element = document.getElementById("contexto-mercado");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full flex items-center overflow-hidden bg-[#e5e4e2]">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/LAVILET PORT.png')" }}
      />
      {/* Light gradient overlay to ensure text readability if needed, though we want to keep it clear */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#1a1a1a]/90" />
      
      {/* Decorative lines - changed to dark/light depending on position */}
      <div className="absolute top-0 left-10 w-px h-full bg-slate-900/10 z-10" />
      <div className="absolute top-0 right-10 w-px h-full bg-slate-900/10 z-10" />

      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-12 lg:px-20 mt-16">
        <div className="max-w-2xl text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-20 h-20 mb-8 border border-[#c48b5d]/40 rounded-full flex items-center justify-center bg-[#c48b5d]/10 backdrop-blur-md shadow-lg"
          >
            <div className="w-12 h-12 rounded-full border border-[#c48b5d]/60 flex items-center justify-center">
              <div className="w-2 h-2 bg-[#c48b5d] rounded-full shadow-[0_0_15px_rgba(196,139,93,0.8)]" />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-light text-slate-900 tracking-tight mb-4 uppercase drop-shadow-sm"
          >
            Análisis de Mercado <br/>
            <span className="font-bold text-[#c48b5d] tracking-tighter">Lavilet</span>
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="h-px bg-[#c48b5d] mb-8"
          />

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-lg md:text-xl text-slate-800 mb-12 max-w-xl font-light tracking-wide drop-shadow-sm bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/50"
          >
            Descubre por qué Lavilet redefine el estándar inmobiliario en Puertas del Sol y justifica su valor por encima del mercado tradicional.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            onClick={handleScroll}
            className="group relative px-8 py-4 bg-slate-900 overflow-hidden rounded-full border border-slate-800 text-[#c48b5d] font-light tracking-widest uppercase text-sm transition-all hover:border-[#c48b5d] hover:shadow-[0_0_30px_rgba(196,139,93,0.3)]"
          >
            <div className="absolute inset-0 w-0 bg-[#c48b5d]/20 transition-all duration-[250ms] ease-out group-hover:w-full" />
            <span className="relative">Explorar Datos</span>
          </motion.button>
        </div>
      </div>
    </section>
  );
}
