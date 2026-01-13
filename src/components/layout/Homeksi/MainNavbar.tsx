"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

// Importamos los componentes desde la carpeta ./navbar
import { NavbarLinks } from '../../ui/navbar/NavbarLinks';
import { NavbarUserArea } from '../../ui/navbar/NavbarUserArea';
import { NavbarMobile } from '../../ui/navbar/NavbarMobile';

const NAV_LINKS = [
  { name: 'Comprar', href: '/buyCar' },
  { name: 'Vender', href: '/sellCar' },
  { name: 'Créditos', href: '/creditCar' },
  { name: 'Nosotros', href: '/aboutUs' },
];

export const MainNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, isLoading, supabase } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-neutral-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
        
        {/* --- 1. LOGO --- */}
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

        {/* --- 2. LINKS (Centro) --- */}
        <NavbarLinks links={NAV_LINKS} />
        
        {/* --- 3. USUARIO / LOGIN (Derecha) --- */}
        <div className="hidden md:block flex-shrink-0">
          <NavbarUserArea 
            user={user} 
            profile={profile} 
            isLoading={isLoading} 
            supabase={supabase} 
          />
        </div>

        {/* --- 4. BOTÓN MENÚ MÓVIL --- */}
        <div className="flex items-center gap-4 md:hidden">
          {user && !isLoading && (
             <div className="h-8 w-8 rounded-full bg-neutral-900 text-white border flex items-center justify-center text-xs font-bold">
                {profile?.full_name ? profile.full_name[0] : 'U'}
             </div>
          )}

          <button 
            className="text-black p-1 focus:outline-none z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* --- 5. CONTENIDO MENÚ MÓVIL --- */}
      <NavbarMobile 
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        links={NAV_LINKS}
        user={user}
        profile={profile}
        isLoading={isLoading}
        supabase={supabase}
      />
    </nav>
  );
};