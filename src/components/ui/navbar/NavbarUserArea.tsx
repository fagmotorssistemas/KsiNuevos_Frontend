'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { KsButton } from '@/components/ui/Homeksi/KsButton';
import {
  getUserDashboardMenuItem,
  type PermissionContext,
  type PermissionMap,
} from '@/lib/permissions';

// --- Sub-componente del Dropdown ---
const UserDropdown = ({
  user,
  profile,
  supabase,
  permCtx,
  permissionsLoading,
}: {
  user: { email: string }
  profile: { full_name?: string | null; role?: string | null }
  supabase: { auth: { signOut: () => Promise<void> } }
  permCtx: PermissionContext
  permissionsLoading?: boolean
}) => {
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

  const handleSignOut = async () => {
        try {
            // 1. Cerramos la sesión en Supabase
            await supabase.auth.signOut();
            
            // 2. Cerramos el menú desplegable
            setIsOpen(false);
            
            // 3. Limpiamos el cache de las rutas para asegurar que el estado de auth cambie
            router.refresh();
            
            // 4. Redirigimos a la página de inicio (src/app/(home)/home/page.tsx)
            router.push('/home');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

  const userInitial = profile?.full_name ? profile.full_name[0].toUpperCase() : user.email[0].toUpperCase();
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'
  const dashboardMenu = useMemo(
    () => getUserDashboardMenuItem(permCtx),
    [permCtx, permissionsLoading]
  )

  const goToDashboard = () => {
    setIsOpen(false)
    window.location.assign(dashboardMenu.href)
  }

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
            <button
              type="button"
              onClick={goToDashboard}
              disabled={permissionsLoading}
              className="w-full text-left block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors disabled:opacity-50"
            >
              {permissionsLoading ? 'Cargando…' : dashboardMenu.label}
            </button>
            <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors">
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
  permissionMap?: PermissionMap;
  permissionsLoading?: boolean;
}

export const NavbarUserArea = ({
  user,
  profile,
  isLoading,
  supabase,
  permissionMap,
  permissionsLoading,
}: NavbarUserAreaProps) => {
  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap ?? {} }),
    [profile?.role, permissionMap]
  )

  if (isLoading) {
    return <div className="h-9 w-24 bg-gray-100 rounded animate-pulse"></div>;
  }

  if (user) {
    return (
      <UserDropdown
        user={user}
        profile={profile}
        supabase={supabase}
        permCtx={permCtx}
        permissionsLoading={permissionsLoading}
      />
    );
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