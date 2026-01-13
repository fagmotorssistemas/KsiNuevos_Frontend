'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Ajusta esta importación si tu KsButton está en otra ruta, estoy usando la ruta absoluta recomendada
import { KsButton } from '@/components/ui/Homeksi/KsButton'; 

// --- Sub-componente del Dropdown ---
const UserDropdown = ({ user, profile, supabase }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    setIsOpen(false);
  };

  const userInitial = profile?.full_name ? profile.full_name[0].toUpperCase() : user.email[0].toUpperCase();
  const userRole = profile?.role === 'cliente' ? 'Cliente' : 'Staff';
  const firstName = profile?.full_name?.split(' ')[0] || "Usuario";

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 focus:outline-none group hover:bg-neutral-50 rounded-full pl-3 pr-1 py-1 transition-all border border-transparent hover:border-neutral-200"
      >
        <div className="flex flex-col text-right hidden lg:block">
          <span className="text-sm font-bold text-neutral-800 leading-none mb-0.5">
            {firstName}
          </span>
          <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
            {userRole}
          </span>
        </div>
        <div className="h-9 w-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shadow-md group-hover:scale-105 transition-transform">
          {userInitial}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-neutral-100 lg:hidden">
             <p className="text-sm font-bold text-gray-900 truncate">{profile?.full_name}</p>
          </div>
          <div className="py-1">
            {profile?.role === 'vendedor' || profile?.role === 'admin' ? (
              <Link href="/leads" className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors" onClick={() => setIsOpen(false)}>
                Dashboard
              </Link>
            ) : (
              <Link href="/perfil" className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors" onClick={() => setIsOpen(false)}>
                Mis Citas
              </Link>
            )}
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors">
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Componente Exportado ---
interface NavbarUserAreaProps {
  user: any;
  profile: any;
  isLoading: boolean;
  supabase: any;
}

export const NavbarUserArea = ({ user, profile, isLoading, supabase }: NavbarUserAreaProps) => {
  if (isLoading) {
    return <div className="h-9 w-24 bg-gray-100 rounded animate-pulse"></div>;
  }

  if (user) {
    return <UserDropdown user={user} profile={profile} supabase={supabase} />;
  }

  return (
    <Link href="/login">
      {/* Usamos size="sm" para el botón pequeño */}
      <KsButton 
        variant="dark" 
        size="sm" 
        className="font-semibold shadow-none hover:shadow-md"
      >
        Iniciar Sesión
      </KsButton>
    </Link>
  );
};