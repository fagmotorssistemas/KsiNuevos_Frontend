"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Mail, UserCheck } from "lucide-react";

export function ExecutiveSignature() {
    const { user, profile } = useAuth();

    if (!profile) return null;

    // Obtener iniciales (seguridad por si full_name es null)
    const initials = profile.full_name
        ? profile.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
        : "EJ";

    // Lógica para el teléfono
    const phoneNumber = (profile as any).phone || user?.phone || "";

    return (
        <div className="">
            <div className="flex justify-between items-end">

                {/* Lado Izquierdo: Información del Asesor */}
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Asesor Responsable
                        </h3>
                        <p className="text-xs font-extrabold text-slate-800 uppercase leading-tight">
                            {profile.full_name || "Asesor Comercial"}
                        </p>

                        {/* Información de contacto más compacta */}
                        <div className="flex flex-col mt-1 gap-0.5">
                            {phoneNumber && (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{phoneNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}