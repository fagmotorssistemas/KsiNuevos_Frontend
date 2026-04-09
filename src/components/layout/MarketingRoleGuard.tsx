'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const ALLOWED = new Set(['admin', 'marketing', 'contable']);

/**
 * Solo admin, marketing y contable pueden usar el módulo de marketing (misma línea de negocio
 * que antes tenían “Videos IA” en el sidebar de contabilidad para roles con menú completo).
 */
export function MarketingRoleGuard({ children }: { children: React.ReactNode }) {
    const { profile, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        if (!profile) {
            router.replace('/login');
            return;
        }
        const r = (profile.role || '').toLowerCase().trim();
        if (!ALLOWED.has(r)) {
            router.replace('/home');
        }
    }, [profile?.role, isLoading, profile, router]);

    if (isLoading || !profile) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 text-sm">
                Cargando…
            </div>
        );
    }

    const r = (profile.role || '').toLowerCase().trim();
    if (!ALLOWED.has(r)) {
        return null;
    }

    return <>{children}</>;
}
