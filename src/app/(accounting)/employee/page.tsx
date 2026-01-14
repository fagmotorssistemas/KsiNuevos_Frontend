"use client";

import { RefreshCw, Users } from "lucide-react";
import { useEmployeesData } from "@/hooks/accounting/useEmployee";
import { EmployeesKpiStats } from "@/components/features/accounting/employee/EmployeesKpiStats";
import { EmployeesTable } from "@/components/features/accounting/employee/EmployeesTable";

export default function EmployeesPage() {
    const { data, loading, refresh } = useEmployeesData();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Gestión de Talento Humano
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        Listado maestro de empleados y nómina
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        Actualizar Datos
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* 1. KPIs */}
                <EmployeesKpiStats
                    data={data ? data.resumen : null}
                    loading={loading}
                />

                {/* 2. Tabla */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                        </div>
                    ) : (
                        <EmployeesTable employees={data?.listado || []} />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    Información sensible de RRHH. Confidencialidad requerida.
                    <br />
                    Sincronizado desde DATA_USR.LISTADO_EMPLEADOS
                </p>
            </div>
        </div>
    );
}