import { CalendarDays, Clock, Utensils } from "lucide-react";
import { MarcacionDia } from "@/types/marcaciones.types";
import {
    formatFechaLarga,
    formatHora,
    formatHoras,
    formatHorasAbs,
} from "@/components/features/accounting/marcaciones/marcaciones-display";
import {
    MarcacionAlertas,
    MarcacionEstadoBadge,
} from "@/components/features/accounting/marcaciones/MarcacionEstadoBadge";

function MetodoLabel({ metodo }: { metodo: string }) {
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

interface MarcacionDiaCardProps {
    dia: MarcacionDia;
    showExtras?: boolean;
}

export function MarcacionDiaCard({ dia, showExtras = false }: MarcacionDiaCardProps) {
    const marcas = dia.marcaciones ?? [];
    const tieneAlmuerzo = Boolean(dia.almuerzoIda || dia.almuerzoVuelta);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold capitalize text-slate-800">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    {formatFechaLarga(dia.fecha)}
                </div>
                <div className="flex items-center gap-2">
                    <MarcacionEstadoBadge estado={dia.estado} />
                    {dia.total != null && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            {dia.total} registro{dia.total === 1 ? "" : "s"}
                        </span>
                    )}
                </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Entrada</p>
                    <p className="font-mono text-sm font-semibold text-slate-900">{formatHora(dia.entrada)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Salida</p>
                    <p className="font-mono text-sm font-semibold text-slate-900">{formatHora(dia.salida)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hechas</p>
                    <p className="text-sm font-semibold text-slate-900">{formatHorasAbs(dia.horasHechas)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Legales</p>
                    <p className="text-sm font-semibold text-slate-900">{formatHorasAbs(dia.horasLegales)}</p>
                </div>
            </div>

            {tieneAlmuerzo && (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <Utensils className="h-3.5 w-3.5" />
                    Almuerzo {formatHora(dia.almuerzoIda)} → {formatHora(dia.almuerzoVuelta)}
                </p>
            )}

            <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">
                    Diferencia {formatHoras(dia.diferencia)}
                </span>
                {showExtras && (
                    <>
                        <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-emerald-800">
                            Extras {formatHorasAbs(dia.extras)}
                        </span>
                        <span className="rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-amber-800">
                            De menos {formatHorasAbs(dia.deMenos)}
                        </span>
                    </>
                )}
            </div>

            <MarcacionAlertas alertas={dia.alertas} />

            {marcas.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    {marcas.map((punto, index) => (
                        <li
                            key={`${dia.fecha}-${punto.fechaHora ?? punto.hora}-${index}`}
                            className="flex items-center justify-between gap-3 text-xs text-slate-500"
                        >
                            <span className="inline-flex items-center gap-1.5 font-mono text-slate-700">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {punto.hora}
                            </span>
                            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5">
                                <MetodoLabel metodo={punto.metodo} />
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
