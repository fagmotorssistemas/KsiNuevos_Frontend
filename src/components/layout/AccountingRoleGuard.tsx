'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  canSeeAccountingSidebarHref,
  isLimitedAccountingFinanceNav,
  canAccessSubmodule,
  type PermissionContext,
} from '@/lib/permissions';

export function AccountingRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, permissionMap, permissionsLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  );

  useEffect(() => {
    if (isLoading || permissionsLoading || !profile) return;

    if (!canSeeAccountingSidebarHref(pathname, permCtx)) {
      let fallback = '/wallet';
      if (isLimitedAccountingFinanceNav(permissionMap)) {
        fallback = '/notasdeventas';
      }
      if (!canSeeAccountingSidebarHref(fallback, permCtx)) {
        fallback = canAccessSubmodule(permCtx, 'cartera-manual') ? '/cartera-manual' : '/home';
      }
      if (pathname !== fallback) {
        router.replace(fallback);
      }
    }
  }, [profile?.role, pathname, isLoading, permissionsLoading, profile, router, permCtx, permissionMap]);

  return <>{children}</>;
}
