'use client';
import Link from 'next/link';
import { KsButton } from '@/components/ui/Homeksi/KsButton';

interface NavbarMobileProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  links: { name: string; href: string }[];
  user: any;
  profile: any;
  isLoading: boolean;
  supabase: any;
}

export const NavbarMobile = ({ isOpen, setIsOpen, links, user, profile, isLoading, supabase }: NavbarMobileProps) => {
  return (
    <div 
      className={`
        md:hidden absolute top-16 left-0 w-full bg-white border-b border-neutral-200 shadow-xl overflow-hidden
        transition-all duration-300 ease-in-out z-40
        ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
      `}
    >
      <div className="flex flex-col px-6 py-8 gap-4">
        {links.map((link) => (
          <Link 
            key={link.name} 
            href={link.href}
            className="text-lg font-bold text-neutral-800 py-2 border-b border-neutral-50"
            onClick={() => setIsOpen(false)}
          >
            {link.name}
          </Link>
        ))}
        
        <div className="pt-4">
          {isLoading ? (
             <div className="h-10 bg-gray-100 rounded w-full"></div>
          ) : user ? (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="font-bold text-gray-900">Hola, {profile?.full_name}</p>
              
              {profile?.role === 'vendedor' || profile?.role === 'admin' ? (
                  <Link href="/leads" onClick={() => setIsOpen(false)}>
                    <KsButton variant="dark" fullWidth size="sm">Dashboard</KsButton>
                  </Link>
              ) : (
                  <Link href="/perfil" onClick={() => setIsOpen(false)}>
                    <KsButton variant="dark" fullWidth size="sm">Mis Citas</KsButton>
                  </Link>
              )}

              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="w-full text-center text-red-600 font-medium py-2 text-sm"
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