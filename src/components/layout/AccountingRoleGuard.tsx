'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Abogado y abogada solo pueden /wallet y /cartera-manual dentro de contailidad.
 * Cualquier otra ruta del módulo redirige a /wallet.
 */
export function AccountingRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !profile) return;
    const r = (profile.role || '').toLowerCase().trim();
    if (r !== 'abogado' && r !== 'abogada') return;

    const isOnWallet =
      pathname === '/wallet' ||
      pathname.startsWith('/wallet/') ||
      pathname === '/cartera-manual' ||
      pathname.startsWith('/cartera-manual/');
    if (!isOnWallet) {
      router.replace('/wallet');
    }
  }, [profile?.role, pathname, isLoading, profile, router]);

  return <>{children}</>;
}
