'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    Wallet,
    Users,
    Landmark,
    FileText,
    Menu,
    X,
    LayoutDashboard,
    PieChart,
    ChevronLeft,
    ChevronRight,
    BanknoteArrowDown,
    Box,
    StickyNote,
    Receipt,
    Wrench,
    ShieldCheck,
    HandCoins,
    FileCheck2,
} from 'lucide-react';

import {
    canSeeAccountingSidebarHref,
    canAccessModule,
    MODULE_SLUGS,
    type PermissionContext,
} from '@/lib/permissions';
import { setSidebarShell } from '@/lib/sidebar-shell';
import { SidebarDevRequestsFooter } from '@/components/layout/SidebarDevRequestsFooter';
import { MobileStaffModuleSwitcher } from '@/components/layout/MobileStaffModuleSwitcher';

type MenuItem = {
    name: string;
    href: string;
    icon: typeof Wallet;
    exact?: boolean;
};

const menuItems: MenuItem[] = [
    // { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cartera', href: '/wallet', icon: Wallet },
    { name: 'Cartera manual', href: '/cartera-manual', icon: HandCoins },
    { name: 'Personal', href: '/employee', icon: Users },
    { name: 'Bancos / Tesorería', href: '/treasury', icon: Landmark },
    { name: 'Reporte de Ventas', href: '/salesreport', icon: PieChart },
    { name: 'Movimientos', href: '/financing', icon: FileText },
    { name: 'Cobros', href: '/cobros', icon: Wallet },
    { name: 'Pagos', href: '/pagos', icon: BanknoteArrowDown },
    { name: 'Notas de Ventas', href: '/notasdeventas', icon: Wallet },
    { name: 'Inventario', href: '/inventario', icon: Box, exact: true },
    { name: 'Reporte Documentación', href: '/inventario/reporte-documentacion', icon: FileCheck2 },
    { name: 'Contratos', href: '/contracts', icon: StickyNote },
    { name: 'Comprobantes', href: '/comprobantes', icon: Receipt },
];

export function AccountingSidebar() {
    const { profile, permissionMap } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = window.setTimeout(() => setMounted(true), 0);
        return () => window.clearTimeout(id);
    }, []);

    useEffect(() => {
        setSidebarShell('accounting');
    }, []);

    const permCtx: PermissionContext = useMemo(
        () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
        [profile?.role, permissionMap]
    );

    const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);
    const toggleDesktopSidebar = () => setIsCollapsed(!isCollapsed);

    const displayedItems = menuItems.filter((item) => canSeeAccountingSidebarHref(item.href, permCtx));

    const extraModuleLinks: MenuItem[] = [];
    if (canAccessModule(permCtx, MODULE_SLUGS.taller)) {
        extraModuleLinks.push({ name: 'Taller', href: '/taller/dashboard', icon: Wrench });
    }
    if (canAccessModule(permCtx, MODULE_SLUGS.seguros)) {
        extraModuleLinks.push({ name: 'Seguros', href: '/seguros', icon: ShieldCheck });
    }

    return (
        <>
            <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-[70] px-4 py-3 flex items-center justify-between shadow-sm">
                <MobileStaffModuleSwitcher
                    fallbackLabel="Contabilidad"
                    icon={
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                            C
                        </div>
                    }
                />
                <button
                    type="button"
                    onClick={toggleMobileSidebar}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    aria-expanded={isMobileOpen}
                    aria-label={isMobileOpen ? 'Cerrar menú del módulo' : 'Abrir menú del módulo'}
                >
                    {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                    aria-hidden
                />
            )}

            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-[65]
                    bg-white border-r border-gray-200
                    flex flex-col overflow-hidden transition-all duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0 max-md:pointer-events-auto' : '-translate-x-full max-md:pointer-events-none'}
                    md:translate-x-0 md:pointer-events-auto md:flex max-md:max-h-[100dvh]
                    w-[17.5rem] ${isCollapsed ? 'md:w-20' : 'md:w-[17.5rem]'}
                `}
            >
                <div className={`h-16 flex items-center border-b border-gray-100 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''} overflow-hidden`}>
                        <div className="min-w-[2.25rem] w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-red-200 shadow-lg">
                            <LayoutDashboard size={18} />
                        </div>

                        <div className={`ml-3 transition-opacity duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                            <h1 className="text-base font-bold text-gray-900 leading-tight whitespace-nowrap">Módulo</h1>
                            <p className="text-xs text-red-600 font-semibold tracking-wide whitespace-nowrap">CONTABILIDAD</p>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <button
                            onClick={toggleDesktopSidebar}
                            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>

                {isCollapsed && (
                    <div className="hidden md:flex justify-center py-2 border-b border-gray-100">
                        <button
                            onClick={toggleDesktopSidebar}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-0.5">
                    {!isCollapsed && (
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 whitespace-nowrap transition-opacity">
                            Gestión General
                        </p>
                    )}

                    {mounted &&
                        [...displayedItems, ...extraModuleLinks].map((item) => {
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={`
                                        group flex items-center rounded-xl transition-all duration-200 relative
                                        ${isCollapsed ? 'justify-center py-2.5 px-2' : 'px-3 py-2.5'}
                                        ${isActive
                                            ? 'bg-red-50 text-red-700 font-medium'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }
                                    `}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                                        <item.icon
                                            size={18}
                                            className={`transition-colors shrink-0 ${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                                        />
                                        <span className={`text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                </nav>

                <SidebarDevRequestsFooter
                    isCollapsed={isCollapsed}
                    onNavigate={() => setIsMobileOpen(false)}
                />
            </aside>
        </>
    );
}
