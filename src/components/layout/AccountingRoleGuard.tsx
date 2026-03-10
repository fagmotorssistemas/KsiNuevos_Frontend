'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Si el usuario tiene rol "abogado", solo puede estar en /wallet.
 * Cualquier otra ruta del módulo contabilidad lo redirige a /wallet.
 */
export function AccountingRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !profile) return;
    if (profile.role !== 'abogado') return;

    const isOnWallet = pathname === '/wallet' || pathname.startsWith('/wallet/');
    if (!isOnWallet) {
      router.replace('/wallet');
    }
  }, [profile?.role, pathname, isLoading, profile, router]);

  return <>{children}</>;
}
