"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, NotificationItem } from "@/hooks/useNotifications";
import { Avatar } from "@/components/ui/avatar";
import { 
    LogOut, User, Bell, Clock, Check, Calendar, Sparkles, AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- FUNCIÓN MAESTRA DE FORMATO (SIN CAMBIAR ZONA HORARIA) ---
const formatFriendlyDate = (dateString: string) => {
    if (!dateString) return "";

    // 1. Separamos fecha y hora. 
    // Entra: "2026-02-10T15:00:00+00:00" O "2026-02-10"
    // Usamos 'T' o espacio como separador.
    const parts = dateString.split(/[T ]/); 
    const datePart = parts[0]; // Siempre es "YYYY-MM-DD"
    let timePart = parts[1];   // Puede ser "15:00:00..." o undefined

    // 2. Limpieza de la hora
    let timeToShow = "";
    if (timePart && timePart.length >= 5) {
        // Cortamos los primeros 5 caracteres: "15:00"
        // Ignoramos segundos y zonas horarias (+00:00)
        timeToShow = timePart.substring(0, 5); 
    }

    // 3. Calculamos nombres de días (Hoy, Mañana)
    const now = new Date();
    const todayString = now.toLocaleDateString('en-CA'); // Truco: devuelve YYYY-MM-DD local
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toLocaleDateString('en-CA');

    // 4. Armamos el texto final
    let dayLabel = "";

    if (datePart === todayString) {
        dayLabel = "Hoy";
    } else if (datePart === tomorrowString) {
        dayLabel = "Mañana";
    } else {
        // Para otros días: "10/02"
        const [year, month, day] = datePart.split('-');
        dayLabel = `${day}/${month}`;
    }

    // Si tenemos hora, la agregamos. Si no, solo el día.
    if (timeToShow) {
        return `${dayLabel}, ${timeToShow}`;
    }
    
    return dayLabel; // Solo "Hoy" o "Mañana"
};

export function UserNav() {
    const { user, profile, supabase } = useAuth();
    const { notifications, markAsRead, hasNotifications } = useNotifications();
    
    const [isOpen, setIsOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const hasUrgent = notifications.some(n => n.status === 'urgent' || n.status === 'bot_urgent');

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        router.refresh();
        router.push('/home');
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

    const renderIcon = (notif: NotificationItem) => {
        if (notif.status === 'urgent') return <AlertTriangle className="h-4 w-4" />;
        // Usamos calendar si no hay bot icon específico
        if (notif.type === 'suggestion') return <Calendar className="h-4 w-4" />; 
        return <Calendar className="h-4 w-4" />;
    };

    const getCardStyle = (notif: NotificationItem) => {
        switch (notif.status) {
            case 'urgent': return "bg-red-50 border-red-200 ring-1 ring-red-100";
            case 'bot_urgent': return "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100";
            case 'bot_info': return "bg-slate-50 border-slate-200";
            default: return "bg-white border-slate-100";
        }
    };

    return (
        <div className="flex items-center gap-3 sm:gap-4">
            
            {/* --- CAMPANA --- */}
            <div className="relative" ref={notifRef}>
                <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className={`relative p-2 rounded-full transition-all outline-none focus:ring-2 focus:ring-offset-2 
                        ${hasUrgent 
                            ? 'bg-red-100 text-red-600 animate-bounce ring-red-300' 
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                >
                    <Bell className={`h-5 w-5 ${hasUrgent ? 'fill-current' : ''}`} />
                    {hasNotifications && (
                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasUrgent ? 'bg-red-400' : 'bg-indigo-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${hasUrgent ? 'bg-red-500' : 'bg-indigo-500'}`}></span>
                        </span>
                    )}
                </button>

                {isNotifOpen && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                        
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${hasUrgent ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <h3 className={`font-bold text-sm ${hasUrgent ? 'text-red-700' : 'text-slate-800'}`}>
                                {hasUrgent ? '⚠️ Atención Requerida' : 'Notificaciones'}
                            </h3>
                            <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border shadow-sm">
                                {notifications.length}
                            </span>
                        </div>

                        <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 space-y-2 bg-slate-50/30">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">
                                    <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-medium">Estás al día</p>
                                    <p className="text-xs opacity-70">Sin tareas ni alertas pendientes</p>
                                </div>
                            ) : (
                                notifications.map((notif) => {
                                    
                                    // AQUI LA MAGIA:
                                    // Si es sugerencia, aplicamos el formateo bonito a la fecha cruda
                                    const displayText = notif.type === 'suggestion' 
                                        ? `Fecha sugerida: ${formatFriendlyDate(notif.start_time)}`
                                        : notif.subtitle; 

                                    return (
                                        <div key={notif.id} className={`rounded-xl p-3 border shadow-sm transition-all group ${getCardStyle(notif)}`}>
                                            <div className="flex items-start gap-3 mb-2">
                                                <div className={`p-2 rounded-lg shrink-0 ${
                                                    notif.status.includes('urgent') ? 'bg-white shadow-sm' : 'bg-slate-100'
                                                }`}>
                                                    {renderIcon(notif)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-sm text-slate-800 truncate pr-2">
                                                            {notif.title}
                                                        </h4>
                                                        {notif.status === 'urgent' && (
                                                            <span className="text-[10px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wide animate-pulse">
                                                                Vence Ya
                                                            </span>
                                                        )}
                                                        {notif.status === 'bot_urgent' && (
                                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                <Clock className="h-3 w-3" /> Ahora
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium truncate">
                                                        {notif.location}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* CAJA DE CONTEXTO */}
                                            <div className="bg-white/60 rounded-lg p-2 mb-3">
                                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                                    {notif.type === 'suggestion' 
                                                        ? <Sparkles className="h-3.5 w-3.5 mt-0.5 text-indigo-500" /> 
                                                        : <Clock className="h-3.5 w-3.5 mt-0.5 text-slate-400" />
                                                    }
                                                    <span className={`font-medium leading-tight ${notif.status.includes('urgent') ? 'text-slate-800' : ''}`}>
                                                        {displayText}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-colors border
                                                    ${notif.status === 'urgent' 
                                                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:shadow-lg shadow-red-200' 
                                                        : notif.status === 'bot_urgent'
                                                            ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:shadow-lg shadow-indigo-200'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                    }`}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                {notif.status.includes('urgent') ? 'ENTENDIDO, DETENER ALERTA' : 'Marcar como visto'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MENÚ USUARIO (Sin cambios) */}
            <div className="relative" ref={menuRef}>
                {/* ... (Tu código del menú de usuario sigue igual) ... */}
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
                            <Link href="/home" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setIsOpen(false)}>
                                <User className="h-4 w-4" /> Mi Perfil
                            </Link>
                        </div>
                        <div className="border-t border-slate-50 py-1">
                            <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                <LogOut className="h-4 w-4" /> Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}