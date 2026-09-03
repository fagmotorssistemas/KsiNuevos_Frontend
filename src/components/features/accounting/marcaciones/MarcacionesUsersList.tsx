"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Users } from "lucide-react";
import { MarcacionUsuario } from "@/types/marcaciones.types";
import { formatDuracion, sumasColumnasDias } from "@/components/features/accounting/marcaciones/marcaciones-display";
import { MarcacionDiasTable } from "@/components/features/accounting/marcaciones/MarcacionDiasTable";

interface MarcacionesUsersListProps {
    usuarios: MarcacionUsuario[];
}

function alertasPersona(user: MarcacionUsuario) {
    return user.dias.flatMap((dia) => dia.alertas ?? []);
}

export function MarcacionesUsersList({ usuarios }: MarcacionesUsersListProps) {
    const [search, setSearch] = useState("");
    const [openUser, setOpenUser] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return usuarios;
        return usuarios.filter(
            (user) =>
                user.nombre.toLowerCase().includes(term) ||
                user.employeeNo.toLowerCase().includes(term)
        );
    }, [usuarios, search]);

    if (usuarios.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Users className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay usuarios en el reporte de marcaciones.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Personal y marcaciones
                </h3>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar nombre o código"
                            className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        />
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium whitespace-nowrap">
                        {filtered.length} personas
                    </span>
                </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500">
                        Ningún usuario coincide con la búsqueda.
                    </div>
                ) : (
                    filtered.map((user) => {
                        const isOpen = openUser === user.employeeNo;
                        const alertas = alertasPersona(user);
                        const sumas = sumasColumnasDias(user.dias);
                        return (
                            <div key={user.employeeNo} className="bg-white">
                                <button
                                    type="button"
                                    onClick={() => setOpenUser(isOpen ? null : user.employeeNo)}
                                    className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-50 transition-colors"
                                    aria-expanded={isOpen}
                                >
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-white shadow-sm shrink-0">
                                        {user.nombre.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-900 text-sm truncate">
                                            {user.nombre}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Código {user.employeeNo}
                                            {alertas.length > 0 && (
                                                <span className="ml-2 text-amber-700">
                                                    {alertas.length} alerta{alertas.length === 1 ? "" : "s"}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-4 text-right shrink-0">
                                        <div>
                                            <p className="text-sm font-bold text-emerald-700">
                                                {formatDuracion(sumas.extras)}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                                                Extra
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-700">
                                                {formatDuracion(sumas.deMenos)}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                                                De menos
                                            </p>
                                        </div>
                                        {user.totales && (
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">
                                                    {formatDuracion(user.totales.horasHechas)}
                                                </p>
                                                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                                                    Hechas
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-base font-bold text-slate-900">
                                                {user.totalMarcaciones}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                                                Marcas
                                            </p>
                                        </div>
                                    </div>
                                    {isOpen ? (
                                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                    )}
                                </button>

                                {isOpen && (
                                    <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-4">
                                        <MarcacionDiasTable
                                            dias={user.dias}
                                            footer={
                                                user.totales
                                                    ? {
                                                          hechas: user.totales.horasHechas,
                                                          legales: user.totales.horasLegales,
                                                      }
                                                    : undefined
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
