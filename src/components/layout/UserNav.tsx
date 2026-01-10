"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications"; // Importamos el nuevo hook
import { Avatar } from "@/components/ui/avatar";
import { 
    LogOut, 
    User, 
    Bell, 
    Clock, 
    Check, 
    Calendar,
    MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";

export function UserNav() {
    const { user, profile, supabase } = useAuth();
    const { notifications, markAsRead, hasNotifications } = useNotifications(); // Usamos las notificaciones
    
    const [isOpen, setIsOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        router.refresh();
        router.push('/login');
    };

    // Cerrar al hacer click fuera (Maneja ambos menús)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // User Menu
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
            // Notification Menu
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    const initials = profile?.full_name 
        ? profile.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() 
        : "U";

    return (
        <div className="flex items-center gap-4">
            
            {/* --- SECCIÓN NOTIFICACIONES --- */}
            <div className="relative" ref={notifRef}>
                <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all outline-none focus:ring-2 focus:ring-slate-200"
                >
                    <Bell className={`h-5 w-5 ${hasNotifications ? 'text-indigo-600 animate-pulse' : ''}`} />
                    
                    {/* Badge Rojo */}
                    {hasNotifications && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </button>

                {/* Dropdown Notificaciones */}
                {isNotifOpen && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                            <h3 className="font-bold text-slate-800 text-sm">Próximas Reuniones</h3>
                            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                {notifications.length} pendiente{notifications.length !== 1 && 's'}
                            </span>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {notifications.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">No tienes citas próximas (20 min)</p>
                                </div>
                            ) : (
                                notifications.map((apt) => {
                                    const timeDate = new Date(apt.start_time);
                                    const timeStr = timeDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
                                    // Calcular minutos restantes aprox
                                    const diffMins = Math.round((timeDate.getTime() - new Date().getTime()) / 60000);

                                    return (
                                        <div key={apt.id} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 hover:bg-white hover:shadow-md transition-all group relative">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-sm text-slate-800 truncate pr-6">
                                                    {apt.title}
                                                </h4>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diffMins <= 5 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    en {diffMins} min
                                                </span>
                                            </div>

                                            <div className="space-y-1 mb-3">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                    <Clock className="h-3 w-3 text-slate-400" />
                                                    <span>{timeStr}</span>
                                                </div>
                                                {apt.location && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <MapPin className="h-3 w-3 text-slate-400" />
                                                        <span className="truncate max-w-[200px]">{apt.location}</span>
                                                    </div>
                                                )}
                                                {(apt.lead?.name || apt.external_client_name) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <User className="h-3 w-3 text-slate-400" />
                                                        <span className="truncate max-w-[200px]">
                                                            {apt.lead?.name || apt.external_client_name}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Botón Entendido */}
                                            <button
                                                onClick={() => markAsRead(apt.id)}
                                                className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                Entendido
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- SECCIÓN PERFIL DE USUARIO --- */}
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 outline-none rounded-full focus:ring-2 focus:ring-slate-200 transition-all"
                >
                    <Avatar initials={initials} alt="User" size="sm" />
                    <div className="hidden md:block text-left">
                        <p className="text-xs font-medium text-slate-700">{profile?.full_name || 'Usuario'}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{profile?.role || 'Vendedor'}</p>
                    </div>
                </button>

                {/* Dropdown Menu Usuario */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-slate-50">
                            <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        
                        <div className="py-1">
                            <Link 
                                href="/profile" 
                                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <User className="h-4 w-4" />
                                Mi Perfil
                            </Link>
                        </div>

                        <div className="border-t border-slate-50 py-1">
                            <button 
                                onClick={handleSignOut}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}