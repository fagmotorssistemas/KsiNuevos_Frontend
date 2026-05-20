'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { canAccessModule, MODULE_SLUGS, type PermissionContext } from '@/lib/permissions';

export function MarketingRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, permissionMap } = useAuth();
  const router = useRouter();

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  );

  useEffect(() => {
    if (isLoading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (!canAccessModule(permCtx, MODULE_SLUGS.marketing)) {
      router.replace('/home');
    }
  }, [isLoading, profile, permCtx, router]);

  if (isLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Cargando…
      </div>
    );
  }

  if (!canAccessModule(permCtx, MODULE_SLUGS.marketing)) {
    return null;
  }

  return <>{children}</>;
}
