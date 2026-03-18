'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function LegalRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !profile) return;
    const role = (profile.role || '').toLowerCase().trim();
    const allowed = role === 'admin' || role === 'abogado' || role === 'abogada';
    if (!allowed && (pathname === '/legal' || pathname.startsWith('/legal/'))) {
      router.replace('/home');
    }
  }, [isLoading, profile, pathname, router]);

  return <>{children}</>;
}

