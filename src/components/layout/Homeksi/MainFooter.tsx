import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin } from 'lucide-react';

// Icono personalizado de TikTok
const TikTokIcon = () => (
  <svg 
    width="20" height="20" viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export const MainFooter = () => {
  return (
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
            <li>
              <Link href="/buyCar" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                Comprar auto
              </Link>
            </li>
            <li>
              <Link href="/sellCar" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                Vender auto
              </Link>
            </li>
            <li>
              <Link href="/creditCar" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                Financiamiento
              </Link>
            </li>
          </ul>
        </div>

        {/* --- COLUMNA 3: SOPORTE --- */}
        <div>
          <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Soporte</h4>
          <ul className="text-neutral-400 text-sm space-y-3 font-medium">
            <li>
              <Link href="/aboutUs" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                Nosotros
              </Link>
            </li>
            <li>
              <Link href="/sellCar#faq-section" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                Preguntas frecuentes
              </Link>
            </li>
            <li>
              <Link href="/aboutUs#sedes" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                Contacto
              </Link>
            </li>
          </ul>
        </div>

        {/* --- COLUMNA 4: REDES (4 EN HORIZONTAL) --- */}
        <div className="flex flex-col items-center md:items-start">
          <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Síguenos</h4>
          <div className="flex flex-row gap-3">
            <Link 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 flex items-center justify-center border border-neutral-800 rounded-md text-neutral-400 hover:text-white hover:border-neutral-600 transition-all hover:bg-neutral-900"
            >
              <Facebook size={18} />
            </Link>
            <Link 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 flex items-center justify-center border border-neutral-800 rounded-md text-neutral-400 hover:text-white hover:border-neutral-600 transition-all hover:bg-neutral-900"
            >
              <Instagram size={18} />
            </Link>
            <Link 
              href="https://tiktok.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 flex items-center justify-center border border-neutral-800 rounded-md text-neutral-400 hover:text-white hover:border-neutral-600 transition-all hover:bg-neutral-900"
            >
              <TikTokIcon />
            </Link>
            <Link 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 flex items-center justify-center border border-neutral-800 rounded-md text-neutral-400 hover:text-white hover:border-neutral-600 transition-all hover:bg-neutral-900"
            >
              <Linkedin size={18} />
            </Link>
          </div>
        </div>
      </div>
      
      {/* --- LÍNEA FINAL --- */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-neutral-900">
        <p className="text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-bold text-center md:text-left">
          &copy; 2026 K-SI NEW • ECUADOR
        </p>
      </div>
    </footer>
  );
};