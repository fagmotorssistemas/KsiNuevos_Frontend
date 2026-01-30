"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications"; 
import { Avatar } from "@/components/ui/avatar";
import { 
    LogOut, 
    User, 
    Bell, 
    Clock, 
    Check, 
    Calendar,
    MapPin,
    Bot,
    Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

export function UserNav() {
    const { user, profile, supabase } = useAuth();
    const { notifications, markAsRead, hasNotifications } = useNotifications();
    
    const [isOpen, setIsOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            // 1. Cerramos la sesión en Supabase
            await supabase.auth.signOut();
            
            // 2. Cerramos el menú desplegable
            setIsOpen(false);
            
            // 3. Limpiamos el cache de las rutas para asegurar que el estado de auth cambie
            router.refresh();
            
            // 4. Redirigimos a la página de inicio (src/app/(home)/home/page.tsx)
            router.push('/home');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    const initials = profile?.full_name 
        ? profile.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() 
        : "U";

    return (
        <div className="flex items-center gap-3 sm:gap-4">
            
            {/* --- CAMPANA DE NOTIFICACIONES --- */}
            <div className="relative" ref={notifRef}>
                <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all outline-none focus:ring-2 focus:ring-slate-200"
                >
                    <Bell className={`h-5 w-5 ${hasNotifications ? 'text-indigo-600 animate-pulse' : ''}`} />
                    
                    {hasNotifications && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </button>

                {isNotifOpen && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                            <h3 className="font-bold text-slate-800 text-sm">Actividad Próxima</h3>
                            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                {notifications.length}
                            </span>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {notifications.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">Sin actividad para los próximos 20 min</p>
                                </div>
                            ) : (
                                notifications.map((notif) => {
                                    const timeDate = new Date(notif.start_time);
                                    const timeStr = timeDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
                                    const diffMins = Math.max(0, Math.round((timeDate.getTime() - new Date().getTime()) / 60000));
                                    
                                    const isSuggestion = notif.type === 'suggestion';

                                    return (
                                        <div key={notif.id} className={`border rounded-xl p-3 transition-all group relative ${isSuggestion ? 'bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                                            
                                            {/* Header Card */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {isSuggestion ? (
                                                        <div className="p-1 bg-indigo-100 text-indigo-600 rounded-md shrink-0">
                                                            <Bot className="h-3.5 w-3.5" />
                                                        </div>
                                                    ) : (
                                                        <div className="p-1 bg-emerald-100 text-emerald-600 rounded-md shrink-0">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                        </div>
                                                    )}
                                                    <h4 className={`font-bold text-sm truncate pr-2 ${isSuggestion ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                        {notif.title}
                                                    </h4>
                                                </div>
                                                
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${diffMins <= 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    en {diffMins} min
                                                </span>
                                            </div>

                                            {/* Body Card */}
                                            <div className="space-y-1 mb-3 pl-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                    <Clock className="h-3 w-3 text-slate-400" />
                                                    <span className="font-medium">{timeStr}</span>
                                                </div>
                                                
                                                {notif.subtitle && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <User className="h-3 w-3 text-slate-400" />
                                                        <span className="truncate max-w-[200px]">{notif.subtitle}</span>
                                                    </div>
                                                )}

                                                {isSuggestion && (
                                                    <div className="flex items-center gap-1 text-[10px] text-indigo-500 mt-1">
                                                        <Sparkles className="h-3 w-3" />
                                                        <span>IA detectó posible disponibilidad</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer Button */}
                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 text-xs font-semibold py-1.5 rounded-lg transition-colors shadow-sm"
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

            {/* --- MENÚ DE USUARIO --- */}
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

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-slate-50">
                            <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                            <Link 
                                href="/home" 
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