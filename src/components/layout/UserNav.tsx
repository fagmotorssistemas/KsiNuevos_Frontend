"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserNav() {
    const { user, profile, supabase } = useAuth(); // Obtenemos supabase del contexto
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Función para cerrar sesión
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        router.refresh(); // Refrescar para actualizar estado
        router.push('/login'); // Redirigir al login
    };

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
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
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 outline-none rounded-full focus:ring-2 focus:ring-slate-200 transition-all"
            >
                <Avatar initials={initials} alt="User" size="sm" className="bg-slate-900 text-white" />
                <div className="hidden md:block text-left">
                    <p className="text-xs font-medium text-slate-700">{profile?.full_name || 'Usuario'}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{profile?.role || 'Vendedor'}</p>
                </div>
            </button>

            {/* Dropdown Menu */}
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
    );
}