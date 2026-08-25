'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionContext } from '@/hooks/usePermissionContext';
import {
  canSeeAccountingSidebarHref,
  isLimitedAccountingFinanceNav,
  resolveFirstAccountingHref,
} from '@/lib/permissions';

export function AccountingRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, permissionMap, permissionsLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const permCtx = usePermissionContext();

  useEffect(() => {
    if (isLoading || permissionsLoading || !profile) return;

    if (!canSeeAccountingSidebarHref(pathname, permCtx)) {
      let fallback = '/wallet';
      if (isLimitedAccountingFinanceNav(permissionMap)) {
        fallback = '/notasdeventas';
      }
      if (!canSeeAccountingSidebarHref(fallback, permCtx)) {
        fallback = resolveFirstAccountingHref(permCtx) ?? '/home';
      }
      if (pathname !== fallback) {
        router.replace(fallback);
      }
    }
  }, [profile?.role, pathname, isLoading, permissionsLoading, profile, router, permCtx, permissionMap]);

  return <>{children}</>;
}
