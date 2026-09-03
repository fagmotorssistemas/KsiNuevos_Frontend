"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search, Snowflake, Users } from "lucide-react";
import { MarcacionesMesData } from "@/types/marcaciones.types";
import {
    formatDuracion,
    sumasColumnasDias,
} from "@/components/features/accounting/marcaciones/marcaciones-display";

interface MarcacionesMesListProps {
    data: MarcacionesMesData;
}

function duracionClass(value: number, kind: "extra" | "menos") {
    if (value <= 0) return "text-slate-400";
    if (kind === "extra") return "text-emerald-700";
    return "text-amber-700";
}

export function MarcacionesMesList({ data }: MarcacionesMesListProps) {
    const [search, setSearch] = useState("");

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return data.empleados
            .filter(
                (emp) =>
                    !term ||
                    emp.empleado.toLowerCase().includes(term) ||
                    emp.employeeNo.toLowerCase().includes(term)
            )
            .map((emp) => {
                const sumas = sumasColumnasDias(emp.dias);
                const alertas = emp.dias.reduce((n, dia) => n + (dia.alertas?.length ?? 0), 0);
                return {
                    employeeNo: emp.employeeNo,
                    nombre: emp.empleado,
                    hechas: emp.totales.hechas || sumas.hechas,
                    legales: emp.totales.legales || sumas.legales,
                    extras: sumas.extras,
                    deMenos: sumas.deMenos,
                    alertas,
                };
            });
    }, [data.empleados, search]);

    const pie = useMemo(
        () =>
            rows.reduce(
                (acc, row) => ({
                    hechas: acc.hechas + row.hechas,
                    legales: acc.legales + row.legales,
                    extras: acc.extras + row.extras,
                    deMenos: acc.deMenos + row.deMenos,
                }),
                { hechas: 0, legales: 0, extras: 0, deMenos: 0 }
            ),
        [rows]
    );

    if (data.empleados.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <Users className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-500">No hay informe de extras para este mes.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Users className="h-5 w-5 text-blue-600" />
                        Resumen del mes
                    </h3>
                    {data.cerrado && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                            <Snowflake className="h-3 w-3" />
                            Mes cerrado
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar nombre o código"
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
                        />
                    </div>
                    <span className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        {rows.length} personas
                    </span>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                    Ningún empleado coincide con la búsqueda.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-[44rem] w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3 font-medium">Empleado</th>
                                <th className="px-3 py-3 font-medium">Código</th>
                                <th className="px-3 py-3 font-medium">Hechas</th>
                                <th className="px-3 py-3 font-medium">Legales</th>
                                <th className="px-3 py-3 font-medium">Extra</th>
                                <th className="px-3 py-3 font-medium">De menos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row) => (
                                <tr key={row.employeeNo} className="bg-white hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        <span className="inline-flex items-center gap-1.5">
                                            {row.nombre}
                                            {row.alertas > 0 && (
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                            )}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                                        {row.employeeNo}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 font-mono tabular-nums text-slate-900">
                                        {formatDuracion(row.hechas)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 font-mono tabular-nums text-slate-500">
                                        {formatDuracion(row.legales)}
                                    </td>
                                    <td className={`whitespace-nowrap px-3 py-3 font-mono tabular-nums ${duracionClass(row.extras, "extra")}`}>
                                        {formatDuracion(row.extras)}
                                    </td>
                                    <td className={`whitespace-nowrap px-3 py-3 font-mono tabular-nums ${duracionClass(row.deMenos, "menos")}`}>
                                        {formatDuracion(row.deMenos)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50 text-slate-900">
                                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500" colSpan={2}>
                                    Totales
                                </td>
                                <td className="px-3 py-3 font-mono text-sm font-semibold tabular-nums">
                                    {formatDuracion(pie.hechas)}
                                </td>
                                <td className="px-3 py-3 font-mono text-sm font-semibold tabular-nums text-slate-500">
                                    {formatDuracion(pie.legales)}
                                </td>
                                <td className={`px-3 py-3 font-mono text-sm font-semibold tabular-nums ${duracionClass(pie.extras, "extra")}`}>
                                    {formatDuracion(pie.extras)}
                                </td>
                                <td className={`px-3 py-3 font-mono text-sm font-semibold tabular-nums ${duracionClass(pie.deMenos, "menos")}`}>
                                    {formatDuracion(pie.deMenos)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
