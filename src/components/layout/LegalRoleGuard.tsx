'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { canAccessModule, MODULE_SLUGS, type PermissionContext } from '@/lib/permissions';

export function LegalRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, permissionMap } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  );

  useEffect(() => {
    if (isLoading || !profile) return;
    if (
      !canAccessModule(permCtx, MODULE_SLUGS.legal) &&
      (pathname === '/legal' || pathname.startsWith('/legal/'))
    ) {
      router.replace('/home');
    }
  }, [isLoading, profile, pathname, router, permCtx]);

  return <>{children}</>;
}
