import React from 'react';

export const HeroSection = () => {
  return (
    <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Imagen con overlay gradiente para mejor lectura */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=2000&auto=format&fit=crop" 
          alt="Fondo Hero" 
          className="w-full h-full object-cover grayscale opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto mt-10">
        <span className="inline-block py-1 px-3 rounded-full bg-red-600/10 text-red-500 text-sm font-bold tracking-widest uppercase mb-4 border border-red-600/20 backdrop-blur-sm">
          Concesionaria Premium
        </span>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
          Tu próximo auto, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">
            con confianza total.
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
          En <strong>K-si Nuevos</strong> redefinimos la experiencia de compra. Calidad certificada, transparencia absoluta y el respaldo que mereces.
        </p>
      </div>
    </section>
  );
}