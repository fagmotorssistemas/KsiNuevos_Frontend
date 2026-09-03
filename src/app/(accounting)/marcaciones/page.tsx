"use client";

import { useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import {
    getCurrentMonthValue,
    getMesActualRange,
    getRangeForMonth,
    useMarcacionesData,
} from "@/hooks/accounting/useMarcaciones";
import { MarcacionesKpiStats } from "@/components/features/accounting/marcaciones/MarcacionesKpiStats";
import { MarcacionesSectionNav } from "@/components/features/accounting/marcaciones/MarcacionesSectionNav";
import { MarcacionesToolbar } from "@/components/features/accounting/marcaciones/MarcacionesToolbar";
import { MarcacionesUsersList } from "@/components/features/accounting/marcaciones/MarcacionesUsersList";
import { MarcacionesRange } from "@/types/marcaciones.types";

export default function MarcacionesPage() {
    const mesActual = getMesActualRange();
    const currentMonthValue = getCurrentMonthValue();
    const [monthInput, setMonthInput] = useState(currentMonthValue);
    const [desdeInput, setDesdeInput] = useState(mesActual.desde);
    const [hastaInput, setHastaInput] = useState(mesActual.hasta);
    const [range, setRange] = useState<MarcacionesRange>(mesActual);
    const { data, loading, error, refresh } = useMarcacionesData(range);

    const aplicarMes = (yearMonth: string) => {
        const seleccionado = yearMonth || currentMonthValue;
        const mesRange = getRangeForMonth(seleccionado);
        setMonthInput(seleccionado);
        setDesdeInput(mesRange.desde);
        setHastaInput(mesRange.hasta);
        setRange(mesRange);
    };

    const consultarRango = () => {
        setRange({
            desde: desdeInput || mesActual.desde,
            hasta: hastaInput || mesActual.hasta,
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Marcaciones
                    {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                </h1>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    Asistencia agrupada por persona y por día
                </p>
            </div>

            <MarcacionesSectionNav />

            <MarcacionesToolbar
                monthInput={monthInput}
                currentMonthValue={currentMonthValue}
                desdeInput={desdeInput}
                hastaInput={hastaInput}
                loading={loading}
                onMonthChange={aplicarMes}
                onDesdeChange={setDesdeInput}
                onHastaChange={setHastaInput}
                onConsultar={consultarRango}
                onMesActual={() => aplicarMes(currentMonthValue)}
                onRefresh={refresh}
            />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MarcacionesKpiStats data={data ? data.resumen : null} loading={loading} />

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {error ? (
                        <div className="py-10 text-center">
                            <p className="text-sm font-medium text-red-600">{error}</p>
                            <button
                                type="button"
                                onClick={refresh}
                                className="mt-3 text-sm text-slate-600 hover:text-slate-900 underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500">
                                Cargando marcaciones. La primera vez puede tardar hasta un minuto.
                            </p>
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"
                                ></div>
                            ))}
                        </div>
                    ) : (
                        <MarcacionesUsersList usuarios={data?.usuarios || []} />
                    )}
                </div>
            </div>
        </div>
    );
}
