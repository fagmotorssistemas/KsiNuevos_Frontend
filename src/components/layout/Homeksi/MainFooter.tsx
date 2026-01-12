import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const MainFooter = () => {
  return (
    // Fondo negro absoluto para máximo contraste con la página blanca
    <footer className="bg-black text-white pt-20 pb-10 px-6 border-t border-neutral-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
        
        {/* --- COLUMNA 1: LOGO --- */}
        <div className="col-span-1 flex flex-col items-center md:items-start">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/logo.png"
              alt="Logo de K-si New"
              width={120}
              height={40}
              // Invertir a blanco puro
              className="object-contain opacity-90 hover:opacity-100 transition-opacity brightness-0 invert"
            />
          </Link>
          <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">
            La plataforma líder en autos seminuevos garantizados. Seguridad y confianza en cada kilómetro.
          </p>
        </div>
        
        {/* --- COLUMNA 2: PLATAFORMA --- */}
        <div>
          <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Plataforma</h4>
          <ul className="text-neutral-400 text-sm space-y-3 font-medium">
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Comprar auto</li>
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Vender auto</li>
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Financiamiento</li>
          </ul>
        </div>

        {/* --- COLUMNA 3: SOPORTE --- */}
        <div>
          <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Soporte</h4>
          <ul className="text-neutral-400 text-sm space-y-3 font-medium">
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Preguntas frecuentes</li>
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Contacto</li>
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Agendar cita</li>
          </ul>
        </div>

        {/* --- COLUMNA 4: LEGAL --- */}
        <div>
          <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Legal</h4>
          <ul className="text-neutral-400 text-sm space-y-3 font-medium">
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Política de Privacidad</li>
            <li className="hover:text-white hover:translate-x-1 transition-all cursor-pointer">Términos y condiciones</li>
          </ul>
        </div>
      </div>
      
      {/* --- LÍNEA FINAL --- */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-bold">
          &copy; 2026 K-SI NEW • ECUADOR
        </p>
        <div className="flex gap-4">
             {/* Aquí podrías poner íconos de redes sociales en gris neutro */}
        </div>
      </div>
    </footer>
  );
};