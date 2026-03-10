'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    Sparkles,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Handshake,
    LayoutGrid,
} from 'lucide-react';

const menuItems = [
    { name: 'Todo', href: '/scraper/todo', icon: LayoutGrid },
    { name: 'Búsqueda manual', href: '/scraper/busqueda-manual', icon: Search },
    { name: 'Mejores oportunidades', href: '/scraper/oportunidades', icon: Handshake },

];

export function ScraperSidebar() {
    const { profile } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);
    const toggleDesktopSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <>
            {/* Botón menú móvil */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-900">Scraper</span>
                </div>
                <button
                    onClick={toggleMobileSidebar}
                    className="p-2 text-slate-700 hover:bg-slate-100 rounded-md"
                >
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-50
                    bg-white border-r border-slate-200
                    flex flex-col transition-all duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0 md:flex
                    w-72 ${isCollapsed ? 'md:w-20' : 'md:w-72'}
                `}
            >
                <div className={`h-20 flex items-center border-b border-slate-100 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''} overflow-hidden`}>
                        <div className="min-w-[2.5rem] w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-amber-200 shadow-lg">
                            <Sparkles size={22} />
                        </div>
                        <div className={`ml-3 transition-opacity duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                            <h1 className="text-lg font-bold text-slate-900 leading-tight whitespace-nowrap">Módulo</h1>
                            <p className="text-xs text-amber-600 font-semibold tracking-wide whitespace-nowrap">SCRAPER</p>
                        </div>
                    </div>
                    {!isCollapsed && (
                        <button
                            onClick={toggleDesktopSidebar}
                            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>

                {isCollapsed && (
                    <div className="hidden md:flex justify-center py-2 border-b border-slate-100">
                        <button
                            onClick={toggleDesktopSidebar}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1">
                    {!isCollapsed && (
                        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 whitespace-nowrap">
                            Scraper
                        </p>
                    )}
                    {menuItems.map((item) => {
                        const path = pathname?.replace(/\/$/, '') || '/';
                        const href = item.href.replace(/\/$/, '') || '/';
                        const isActive = path === href || path.startsWith(href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`
                                    group flex items-center rounded-xl transition-all duration-200 relative
                                    ${isCollapsed ? 'justify-center py-3 px-2' : 'justify-between px-4 py-3.5'}
                                    ${isActive
                                        ? 'bg-amber-50 text-amber-700 font-medium'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }
                                `}
                                title={isCollapsed ? item.name : ''}
                            >
                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                                    <item.icon
                                        size={20}
                                        className={`transition-colors shrink-0 ${isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                                    />
                                    <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                                        {item.name}
                                    </span>
                                </div>
                                {isActive && !isCollapsed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                )}
                                {isActive && isCollapsed && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-amber-500" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {!isCollapsed && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold uppercase">
                                {profile?.role?.substring(0, 2) || 'US'}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-bold text-slate-900 truncate w-32">
                                    {profile?.full_name || 'Usuario'}
                                </span>
                                <span className="text-[10px] text-slate-500 capitalize">
                                    {profile?.role || 'Agente'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}
