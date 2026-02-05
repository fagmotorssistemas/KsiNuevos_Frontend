'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ClipboardList, // Para Recepción
    Car,           // Para Trabajos
    Package,       // Para Inventario
    Landmark,      // Para Finanzas
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Wrench,        // Icono del Taller
    Settings
} from 'lucide-react';

// Definición de los items del menú del Taller
const menuItems = [
    { name: 'Dashboard', href: '/dashboardTaller', icon: LayoutDashboard },
    { name: 'Recepción', href: '/recepcion', icon: ClipboardList },
    { name: 'Trabajos Activos', href: '/trabajos', icon: Car },
    { name: 'Inventario', href: '/inventariotaller', icon: Package },
    { name: 'Finanzas', href: '/finanzastaller', icon: Landmark },
    // Podemos agregar configuración si hace falta a futuro
    // { name: 'Configuración', href: '/taller/configuracion', icon: Settings },
];

export function TallerSidebar() {
    // Estado para móvil (abierto/cerrado)
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // Estado para escritorio (colapsado/expandido)
    const [isCollapsed, setIsCollapsed] = useState(false);

    const pathname = usePathname();

    const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);
    const toggleDesktopSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <>
            {/* --- BOTÓN MENÚ MÓVIL (Solo visible en pantallas pequeñas) --- */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        <Wrench size={18} />
                    </div>
                    <span className="font-bold text-gray-900">Taller Nova</span>
                </div>
                <button
                    onClick={toggleMobileSidebar}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* --- OVERLAY PARA MÓVIL (Fondo oscuro al abrir menú) --- */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* --- SIDEBAR PRINCIPAL --- */}
            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-50
                    bg-white border-r border-gray-200
                    flex flex-col transition-all duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0 md:flex
                    /* Ancho: fijo en móvil, dinámico en escritorio */
                    w-72 ${isCollapsed ? 'md:w-20' : 'md:w-72'}
                `}
            >
                {/* Header del Sidebar */}
                <div className={`h-20 flex items-center border-b border-gray-100 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>

                    {/* Logo y Texto */}
                    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''} overflow-hidden`}>
                        <div className="min-w-[2.5rem] w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                            <Wrench size={20} />
                        </div>

                        {/* Texto del título (se oculta si está colapsado) */}
                        <div className={`ml-3 transition-opacity duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight whitespace-nowrap">Auto Nova</h1>
                            <p className="text-xs text-blue-600 font-semibold tracking-wide whitespace-nowrap">GESTIÓN TALLER</p>
                        </div>
                    </div>

                    {/* Botón de Colapsar (Solo visible en Desktop cuando está expandido) */}
                    {!isCollapsed && (
                        <button
                            onClick={toggleDesktopSidebar}
                            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>

                {/* Si está colapsado, mostramos el botón de expandir en una barra separada o centrado arriba */}
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

                {/* Lista de Navegación */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1">
                    {!isCollapsed && (
                        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 whitespace-nowrap transition-opacity">
                            Módulos Operativos
                        </p>
                    )}

                    {menuItems.map((item) => {
                        // Lógica de activo: coincidencia exacta para dashboard, startsWith para subrutas
                        const isActive = item.href === '/taller' 
                            ? pathname === item.href 
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`
                                    group flex items-center rounded-xl transition-all duration-200 relative
                                    ${isCollapsed ? 'justify-center py-3 px-2' : 'justify-between px-4 py-3.5'}
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                                title={isCollapsed ? item.name : ''}
                            >
                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                                    <item.icon
                                        size={20}
                                        className={`transition-colors shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                                    />

                                    {/* Texto del Link */}
                                    <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                                        {item.name}
                                    </span>
                                </div>

                                {/* Indicador activo (punto) */}
                                {isActive && !isCollapsed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                )}

                                {/* Indicador activo (borde si está colapsado) */}
                                {isActive && isCollapsed && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-blue-600" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}