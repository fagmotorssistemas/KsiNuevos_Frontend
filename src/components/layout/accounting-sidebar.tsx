'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Wallet,
    Users,
    Landmark,
    FileText,
    Menu,
    X,
    LayoutDashboard,
    PieChart,
    LogOut,
    ChevronRight
} from 'lucide-react';

// Definición de los items del menú
const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cartera', href: '/wallet', icon: Wallet },
    { name: 'Personal', href: '/employee', icon: Users },
    { name: 'Bancos / Tesorería', href: '/treasury', icon: Landmark },
    { name: 'Reporte de Ventas', href: '/salesreport', icon: PieChart },
    { name: 'Facturación', href: '/billing', icon: FileText },
];

export function AccountingSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* --- BOTÓN MENÚ MÓVIL (Solo visible en pantallas pequeñas) --- */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                        C
                    </div>
                    <span className="font-bold text-gray-900">Contabilidad</span>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* --- OVERLAY PARA MÓVIL (Fondo oscuro al abrir menú) --- */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* --- SIDEBAR PRINCIPAL --- */}
            <aside
                className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 h-full bg-white border-r border-gray-200
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex
        `}
            >
                {/* Header del Sidebar */}
                <div className="h-20 flex items-center px-8 border-b border-gray-100">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-red-200 shadow-lg">
                        <LayoutDashboard size={20} />
                    </div>
                    <div className="ml-3">
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">Módulo</h1>
                        <p className="text-xs text-red-600 font-semibold tracking-wide">CONTABILIDAD</p>
                    </div>
                </div>

                {/* Lista de Navegación */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        Gestión General
                    </p>

                    {menuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)} // Cierra el menú en móvil al hacer click
                                className={`
                  group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200
                  ${isActive
                                        ? 'bg-red-50 text-red-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon
                                        size={20}
                                        className={`transition-colors ${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                                    />
                                    <span>{item.name}</span>
                                </div>

                                {/* Indicador activo (punto o flecha) */}
                                {isActive && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer del Sidebar (Perfil de usuario) */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">Administrador</p>
                            <p className="text-xs text-gray-500 truncate">admin@empresa.com</p>
                        </div>
                        <button className="text-gray-400 hover:text-red-600 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}