'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    ShieldCheck, Menu, X, ChevronLeft, 
    Truck, Users2, CreditCard, Wrench, 
    PackageSearch, BarChart3, MapPin
} from 'lucide-react';

// Definimos los tipos de vista disponibles
export type RastreoView = 'DASHBOARD' | 'INVENTARIO' | 'INSTALACION' | 'FORMULARIO' | 'FINANCIERO';

interface SidebarProps {
    currentView: RastreoView;
    onNavigate: (view: RastreoView) => void;
}

export function RastreadoresSidebar({ currentView, onNavigate }: SidebarProps) {
    const { profile } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // MENÚ DEFINITIVO (Alineado a tu arquitectura)
    const menuItems = [
        { 
            id: 'DASHBOARD', 
            label: 'Instalaciones / Ventas', 
            icon: MapPin,
            description: 'Gestión de vinculaciones'
        },
        { 
            id: 'INVENTARIO', 
            label: 'Bodega & Stock', 
            icon: PackageSearch, // Icono perfecto para inventario
            description: 'Ingresos y control de IMEIs'
        },
        {
            id: 'INSTALACION',
            label: 'Instaladores',
            icon: Wrench,
            description: 'Gestión de técnicos e instalaciones'
        },
        { 
            id: 'FINANCIERO', 
            label: 'Cartera', 
            icon: BarChart3,
            description: 'Rentabilidad del módulo' 
        },
        // Futuros módulos
    ];

    const handleNavigation = (view: string) => {
        onNavigate(view as RastreoView);
        setIsMobileOpen(false);
    };

    return (
        <>
            {/* --- HEADER MÓVIL --- */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold">R</div>
                    <span className="font-bold text-slate-900">Módulo GPS</span>
                </div>
                <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-slate-700 hover:bg-slate-100 rounded-md">
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* --- ASIDE PRINCIPAL --- */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex
                ${isCollapsed ? 'md:w-20' : 'md:w-72'}
            `}>
                {/* Logo Area */}
                <div className={`h-20 flex items-center border-b border-slate-100 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
                    <div className={`flex items-center overflow-hidden`}>
                        <div className="min-w-[2.5rem] w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                            <ShieldCheck size={20} />
                        </div>
                        <div className={`ml-3 transition-opacity duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                            <h1 className="text-lg font-bold text-slate-900 leading-tight">Módulo</h1>
                            <p className="text-[10px] text-blue-700 font-black tracking-widest">GESTIÓN GPS</p>
                        </div>
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                        <ChevronLeft size={20} className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Navegación */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {!isCollapsed && (
                        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            Operaciones
                        </p>
                    )}

                    {menuItems.map((item) => {
                        const isActive = currentView === item.id || (currentView === 'FORMULARIO' && item.id === 'DASHBOARD');
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavigation(item.id)}
                                className={`
                                    w-full group flex items-center rounded-xl transition-all duration-200
                                    ${isCollapsed ? 'justify-center py-3 px-2' : 'justify-between px-4 py-3.5'}
                                    ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`${isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    {!isCollapsed && (
                                        <div className="text-left">
                                            <span className={`block text-sm ${isActive ? 'font-black' : 'font-medium'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer Usuario */}
                {!isCollapsed && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-700 text-xs font-black uppercase shadow-sm">
                                {profile?.role?.substring(0, 2) || 'AD'}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-bold text-slate-900 truncate">{profile?.full_name || 'Administrador'}</span>
                                <span className="text-[10px] text-slate-500 font-medium capitalize">{profile?.role || 'Gerencia'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}