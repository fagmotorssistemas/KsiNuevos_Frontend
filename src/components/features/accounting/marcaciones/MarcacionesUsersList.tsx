"use client";

import { useMemo, useState } from "react";
import {
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock,
    Fingerprint,
    ScanFace,
    Search,
    Users,
} from "lucide-react";
import { MarcacionUsuario } from "@/types/marcaciones.types";

interface MarcacionesUsersListProps {
    usuarios: MarcacionUsuario[];
}

function formatFecha(fecha: string) {
    const parsed = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return fecha;
    return parsed.toLocaleDateString("es-EC", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function metodoLabel(metodo: string) {
    const normalized = metodo.trim().toLowerCase();
    const labels: Record<string, string> = {
        rostro: "Rostro",
        huella: "Huella",
        tarjeta: "Tarjeta",
        password: "Contraseña",
        clave: "Clave",
        pin: "PIN",
    };
    return labels[normalized] ?? (metodo ? metodo.charAt(0).toUpperCase() + metodo.slice(1) : "—");
}

function MetodoIcon({ metodo }: { metodo: string }) {
    const normalized = metodo.trim().toLowerCase();
    if (normalized === "rostro") return <ScanFace className="h-3.5 w-3.5" />;
    if (normalized === "huella") return <Fingerprint className="h-3.5 w-3.5" />;
    return <Clock className="h-3.5 w-3.5" />;
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
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-base font-bold text-slate-900">
                                            {user.totalMarcaciones}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                                            Marcaciones
                                        </p>
                                    </div>
                                    {isOpen ? (
                                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                    )}
                                </button>

                                {isOpen && (
                                    <div className="px-4 pb-4 bg-slate-50/80 border-t border-slate-100">
                                        {user.dias.length === 0 ? (
                                            <p className="py-6 text-center text-sm text-slate-500">
                                                Esta persona no tiene marcaciones en el periodo.
                                            </p>
                                        ) : (
                                            <div className="space-y-3 pt-3">
                                                {user.dias.map((dia) => (
                                                    <div
                                                        key={dia.fecha}
                                                        className="rounded-xl border border-slate-200 bg-white p-4"
                                                    >
                                                        <div className="flex items-center justify-between gap-3 mb-3">
                                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 capitalize">
                                                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                                                {formatFecha(dia.fecha)}
                                                            </div>
                                                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                {dia.total} registro{dia.total === 1 ? "" : "s"}
                                                            </span>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {dia.marcaciones.map((punto, index) => (
                                                                <li
                                                                    key={`${dia.fecha}-${punto.fechaHora}-${index}`}
                                                                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                                                >
                                                                    <span className="font-mono text-sm font-semibold text-slate-900">
                                                                        {punto.hora}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md">
                                                                        <MetodoIcon metodo={punto.metodo} />
                                                                        {metodoLabel(punto.metodo)}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
