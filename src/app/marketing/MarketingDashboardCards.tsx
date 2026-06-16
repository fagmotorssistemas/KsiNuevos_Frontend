'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
    ArrowRight,
    ScrollText,
    Megaphone,
    BarChart3,
    CalendarDays,
    Sparkles,
    Code2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
    canSeeMarketingSidebarHref,
    type PermissionContext,
} from '@/lib/permissions';

type DashboardCard = {
    href: string;
    title: string;
    description: string;
    icon: typeof ScrollText;
    iconClassName: string;
    arrowClassName: string;
    borderHoverClassName: string;
};

const marketingCards: DashboardCard[] = [
    {
        href: '/marketing/guiones',
        title: 'Guiones del Día',
        description: 'Guiones por fecha, agrupados por vendedor y por vehículo.',
        icon: ScrollText,
        iconClassName: 'bg-slate-900 shadow-slate-900/10',
        arrowClassName: 'text-slate-900',
        borderHoverClassName: 'hover:border-slate-200',
    },
    {
        href: '/marketing/publicaciones',
        title: 'Publicaciones',
        description: 'Videos publicados con métricas y posts informativos/educativos.',
        icon: Megaphone,
        iconClassName: 'bg-violet-600 shadow-violet-500/20',
        arrowClassName: 'text-violet-600',
        borderHoverClassName: 'hover:border-violet-200',
    },
    {
        href: '/marketing/metricas',
        title: 'Métricas',
        description: 'KPI general + Top/Bottom por retención + huérfanos.',
        icon: BarChart3,
        iconClassName: 'bg-emerald-600 shadow-emerald-500/20',
        arrowClassName: 'text-emerald-600',
        borderHoverClassName: 'hover:border-emerald-200',
    },
    {
        href: '/marketing/planificador',
        title: 'Planificador',
        description: 'Calendario, tareas, recursos y eventos de equipo para marketing.',
        icon: CalendarDays,
        iconClassName: 'bg-gradient-to-br from-violet-500 to-violet-700 shadow-violet-500/20',
        arrowClassName: 'text-violet-600',
        borderHoverClassName: 'hover:border-violet-200',
    },
    {
        href: '/marketing/videos',
        title: 'Videos',
        description: 'Fábrica automatizada de Reels (AssemblyAI + Gemini + Creatomate).',
        icon: Sparkles,
        iconClassName: 'bg-gradient-to-br from-violet-500 to-violet-700 shadow-violet-500/20',
        arrowClassName: 'text-violet-600',
        borderHoverClassName: 'hover:border-violet-200',
    },
];

export function MarketingDashboardCards() {
    const { profile, permissionMap } = useAuth();

    const permCtx: PermissionContext = useMemo(
        () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
        [profile?.role, permissionMap]
    );

    const visibleCards = marketingCards.filter((card) =>
        canSeeMarketingSidebarHref(card.href, permCtx)
    );

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {visibleCards.map((card) => (
                    <Link
                        key={card.href}
                        href={card.href}
                        className={`group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all ${card.borderHoverClassName} hover:shadow-md`}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${card.iconClassName}`}
                            >
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{card.title}</h2>
                                <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                            </div>
                        </div>
                        <ArrowRight
                            className={`w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1 ${card.arrowClassName}`}
                        />
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Link
                    href="/solicitudes-desarrollo"
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-lg">
                            <Code2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Solicitudes a Desarrollo</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Reporta fallas o pide mejoras al equipo de software con evidencia adjunta.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-800 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </>
    );
}
