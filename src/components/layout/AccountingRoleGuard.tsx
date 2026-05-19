'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { canSeeAccountingSidebarHref, type PermissionContext } from '@/lib/permissions';

/**
 * Abogado y abogada solo pueden /wallet y /cartera-manual (y dashboard) dentro de contabilidad.
 * El resto de rutas del layout contable redirige a /wallet.
 *
 * Usuarios sin lectura de cartera pero con notas de ventas: solo rutas permitidas por permisos
 * (el middleware ya bloquea el resto).
 */
export function AccountingRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, permissionMap } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  );

  useEffect(() => {
    if (isLoading || !profile) return;
    const r = (profile.role || '').toLowerCase().trim();

    if (r === 'abogado' || r === 'abogada') {
      const isOnWallet =
        pathname === '/wallet' ||
        pathname.startsWith('/wallet/') ||
        pathname === '/cartera-manual' ||
        pathname.startsWith('/cartera-manual/') ||
        pathname === '/dashboard' ||
        pathname.startsWith('/dashboard/');
      if (!isOnWallet) {
        router.replace('/wallet');
      }
      return
    }

    if (!canSeeAccountingSidebarHref(pathname, permCtx)) {
      let fallback = '/wallet'
      if (canSeeAccountingSidebarHref('/notasdeventas', permCtx)) {
        fallback = '/notasdeventas'
      }
      if (!canSeeAccountingSidebarHref(fallback, permCtx)) {
        fallback = '/home'
      }
      if (pathname !== fallback) {
        router.replace(fallback)
      }
    }
  }, [profile?.role, pathname, isLoading, profile, router, permCtx]);

  return <>{children}</>;
}
