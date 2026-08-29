'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { KsButton } from '@/components/ui/Homeksi/KsButton';
import { useRouter, usePathname } from 'next/navigation';
import { usePermissionContext } from '@/hooks/usePermissionContext';
import { getUserDashboardMenuItem, type PermissionMap } from '@/lib/permissions';
import { NavbarVehicleSearch } from '@/components/layout/Homeksi/NavbarVehicleSearch';
import { isPublicNavLinkActive } from '@/lib/nav/isPublicNavLinkActive';
import { PUBLIC_PATHS } from '@/lib/nav/publicPaths';

interface NavbarMobileProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  links: { name: string; href: string }[];
  user: any;
  profile: any;
  isLoading: boolean;
  supabase: any;
  permissionMap?: PermissionMap;
  permissionsLoading?: boolean;
}

export const NavbarMobile = ({
  isOpen,
  setIsOpen,
  links,
  user,
  profile,
  isLoading,
  supabase,
  permissionsLoading,
}: NavbarMobileProps) => {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const permCtx = usePermissionContext()
  const dashboardMenu = useMemo(
    () => getUserDashboardMenuItem(permCtx),
    [permCtx, permissionsLoading]
  )

  const goToDashboard = () => {
    setIsOpen(false)
    window.location.assign(dashboardMenu.href)
  }

  // 3. Creamos la función de cierre de sesión
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsOpen(false); // Cerramos el menú móvil
      router.refresh(); // Refrescamos las rutas para limpiar el estado de auth
      router.push(PUBLIC_PATHS.home);
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  return (
    <div 
      className={`
        lg:hidden absolute top-16 left-0 w-full bg-white border-b border-neutral-200 shadow-xl
        transition-all duration-300 ease-in-out z-40
        ${isOpen ? 'max-h-[calc(100vh-4rem)] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'}
      `}
    >
      <div className="flex flex-col px-6 py-8 gap-4">
        <NavbarVehicleSearch className="w-full" />
        {links.map((link) => {
          const active = isPublicNavLinkActive(link.href, pathname)
          return (
          <Link 
            key={link.name} 
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`text-lg font-bold py-2 px-3 rounded-xl border ${
              active
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-transparent text-neutral-800'
            }`}
            onClick={() => setIsOpen(false)}
          >
            {link.name}
          </Link>
          )
        })}
        
        <div className="pt-4">
          {isLoading ? (
             <div className="h-10 bg-gray-100 rounded w-full"></div>
          ) : user ? (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="font-bold text-gray-900">Hola, {profile?.full_name}</p>
              
              <KsButton
                variant="dark"
                fullWidth
                size="sm"
                disabled={permissionsLoading}
                onClick={goToDashboard}
              >
                {permissionsLoading ? 'Cargando…' : dashboardMenu.label}
              </KsButton>

              {/* 4. Usamos la nueva función handleLogout */}
              <button 
                onClick={handleLogout}
                className="w-full text-center text-red-600 font-medium py-2 text-sm hover:bg-red-50 rounded-md transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <Link href="/login" onClick={() => setIsOpen(false)}>
              <KsButton variant="dark" fullWidth className="justify-center">
                Iniciar Sesión
              </KsButton>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};