'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  isRouteAllowed,
  type PermissionContext,
} from '@/lib/permissions';

export function MarketingRoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, isLoading, permissionMap, permissionsLoading } = useAuth();
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

    if (!profile) {
      const redirect = pathname
        ? `?redirect=${encodeURIComponent(pathname)}`
        : '';
      router.replace(`/login${redirect}`);
      return;
    }

    if (!canAccessMarketingRoute) {
      router.replace('/home');
    }
  }, [
    isLoading,
    permissionsLoading,
    profile,
    canAccessMarketingRoute,
    pathname,
    router,
  ]);

  if ((isLoading || permissionsLoading) && !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Cargando…
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (!permissionsLoading && !canAccessMarketingRoute) {
    return null;
  }

  return <>{children}</>;
}
