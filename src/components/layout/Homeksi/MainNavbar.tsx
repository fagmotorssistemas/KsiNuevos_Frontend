"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { KsButton } from '../../ui/Homeksi/KsButton';

export const MainNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Comprar', href: '/buyCar' },
    { name: 'Vender', href: '/sellCar' },
    { name: 'Créditos', href: '/takeCareOfYourCar' },
    { name: 'Nosotros', href: '/aboutUs' },
  ];

  return (
<nav className="fixed top-0 w-full z-50 bg-white backdrop-blur-md border-b border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative z-50 bg-white">
        
        {/* --- IZQUIERDA: LOGO --- */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Logo de K-si New"
              width={100}
              height={35}
              priority
              className="object-contain"
            />
          </Link>
        </div>

        {/* --- CENTRO: NAVEGACIÓN (Desktop) --- */}
        <div className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="text-sm font-bold text-slate-600 hover:text-red-600 transition-colors relative group tracking-wider"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-600 transition-all group-hover:w-full"></span>
            </Link>
          ))}
        </div>
        
        {/* --- DERECHA: BOTÓN (Desktop) --- */}
        <div className="hidden md:block flex-shrink-0">
          <Link href="/login">
            <KsButton variant="dark" className="py-2.5 px-6 text-sm">
              Iniciar Sesión
            </KsButton>
          </Link>
        </div>

        {/* --- MOBILE TOGGLE --- */}
        <button 
          className="md:hidden text-slate-900 font-bold p-2 focus:outline-none z-50"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
        </button>
      </div>

      {/* --- MENÚ DESPLEGABLE MOBILE (ANIMADO) --- */}
      <div 
        className={`
          md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-xl overflow-hidden
          transition-all duration-500 ease-in-out
          ${isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="flex flex-col px-6 py-8 gap-6">
          {navLinks.map((link, index) => (
            <Link 
              key={link.name} 
              href={link.href}
              className={`
                text-lg font-bold text-slate-700 hover:text-red-600 transition-all border-b border-slate-50 pb-2
                transform duration-500
                ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
              `}
              // Añadimos un pequeño retraso a cada item para un efecto cascada
              style={{ transitionDelay: `${index * 50}ms` }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          
          <div 
             className={`transition-all duration-700 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
             style={{ transitionDelay: '200ms' }}
          >
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <KsButton variant="dark" className="w-full py-3 text-base justify-center mt-2">
                Iniciar Sesión
              </KsButton>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};