'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  isRouteAllowed,
  type PermissionContext,
} from '@/lib/permissions';

/**
 * Igual que AccountingRoleGuard: no desmonta hijos mientras revalida auth/permisos.
 * Evita que un F5 en marketing “reinicie” sidebar + página.
 */
export function MarketingRoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, user, isLoading, permissionMap, permissionsLoading } = useAuth();
  const router = useRouter();

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  );

  const canAccessMarketingRoute = useMemo(() => {
    if (!profile || !pathname) return false;
    return isRouteAllowed(pathname, permCtx);
  }, [profile, pathname, permCtx]);

  useEffect(() => {
    if (isLoading || permissionsLoading) return;

    if (!user) {
      const redirect = pathname
        ? `?redirect=${encodeURIComponent(pathname)}`
        : '';
      router.replace(`/login${redirect}`);
      return;
    }

    if (!profile) return;

    if (!canAccessMarketingRoute) {
      router.replace('/home');
    }
  }, [
    isLoading,
    permissionsLoading,
    user,
    profile,
    canAccessMarketingRoute,
    pathname,
    router,
  ]);

  return <>{children}</>;
}
