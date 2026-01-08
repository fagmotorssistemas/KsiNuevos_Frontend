import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const MainFooter = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-16 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
        
        {/* --- COLUMNA 1: LOGO Y SLOGAN --- */}
        <div className="col-span-1">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/logo.png"
              alt="Logo de K-si New"
              width={100}
              height={35}
              className="object-contain mx-auto md:mx-0 opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            />
          </Link>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
            La plataforma líder en autos seminuevos garantizados. Seguridad y confianza en cada kilómetro.
          </p>
        </div>
        
        {/* --- COLUMNA 2: PLATAFORMA --- */}
        <div>
          <h4 className="font-bold mb-6 text-slate-900 uppercase text-xs tracking-widest">Plataforma</h4>
          <ul className="text-slate-500 text-sm space-y-3">
            <li className="hover:text-red-600 cursor-pointer transition-colors">Comprar auto</li>
            <li className="hover:text-red-600 cursor-pointer transition-colors">Vender auto</li>
            <li className="hover:text-red-600 cursor-pointer transition-colors">Cambiar auto</li>
          </ul>
        </div>

        {/* --- COLUMNA 3: SOPORTE --- */}
        <div>
          <h4 className="font-bold mb-6 text-slate-900 uppercase text-xs tracking-widest">Soporte</h4>
          <ul className="text-slate-500 text-sm space-y-3">
            <li className="hover:text-red-600 cursor-pointer transition-colors">Preguntas frecuentes</li>
            <li className="hover:text-red-600 cursor-pointer transition-colors">Contacto</li>
            <li className="hover:text-red-600 cursor-pointer transition-colors">Garantías</li>
          </ul>
        </div>

        {/* --- COLUMNA 4: LEGAL --- */}
        <div>
          <h4 className="font-bold mb-6 text-slate-900 uppercase text-xs tracking-widest">Legal</h4>
          <ul className="text-slate-500 text-sm space-y-3">
            <li className="hover:text-red-600 cursor-pointer transition-colors">Privacidad</li>
            <li className="hover:text-red-600 cursor-pointer transition-colors">Términos y condiciones</li>
          </ul>
        </div>
      </div>
      
      {/* --- LÍNEA FINAL --- */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-50 text-center">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          &copy; 2026 K-SI NEW • TU PRÓXIMO AUTO TE ESPERA.
        </p>
      </div>
    </footer>
  );
};