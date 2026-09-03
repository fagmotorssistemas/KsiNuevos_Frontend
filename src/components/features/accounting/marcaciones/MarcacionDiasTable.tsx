import { AlertTriangle } from "lucide-react";
import { MarcacionDia } from "@/types/marcaciones.types";
import {
    deMenosDelDia,
    extraDelDia,
    formatAlmuerzo,
    formatDiaCorto,
    formatDuracion,
    formatFechaCorta,
    formatHora,
    formatSalida,
} from "@/components/features/accounting/marcaciones/marcaciones-display";

interface MarcacionDiasTableProps {
    dias: MarcacionDia[];
    footer?: {
        hechas?: number | null;
        legales?: number | null;
        extras?: number | null;
        deMenos?: number | null;
    };
}

function duracionClass(value: number, kind: "extra" | "menos") {
    if (value <= 0) return "text-slate-400";
    if (kind === "extra") return "text-emerald-700";
    return "text-amber-700";
}

export function MarcacionDiasTable({ dias, footer }: MarcacionDiasTableProps) {
    if (dias.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-slate-500">
                Esta persona no tiene días en el periodo.
            </p>
        );
    }

    const extrasTotal = dias.reduce((sum, dia) => sum + extraDelDia(dia), 0);
    const deMenosTotal = dias.reduce((sum, dia) => sum + deMenosDelDia(dia), 0);
    const hechasTotal = footer?.hechas ?? dias.reduce((sum, dia) => sum + (dia.horasHechas ?? 0), 0);
    const legalesTotal = footer?.legales ?? dias.reduce((sum, dia) => sum + (dia.horasLegales ?? 0), 0);

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[52rem] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50">
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 font-medium">Fecha</th>
                        <th className="px-3 py-3 font-medium">Día</th>
                        <th className="px-3 py-3 font-medium">Entrada</th>
                        <th className="px-3 py-3 font-medium">Almuerzo</th>
                        <th className="px-3 py-3 font-medium">Salida</th>
                        <th className="px-3 py-3 font-medium">Hechas</th>
                        <th className="px-3 py-3 font-medium">Legales</th>
                        <th className="px-3 py-3 font-medium">Extra</th>
                        <th className="px-3 py-3 font-medium">De menos</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {dias.map((dia) => {
                        const extra = extraDelDia(dia);
                        const deMenos = deMenosDelDia(dia);
                        const hasAlertas = (dia.alertas?.length ?? 0) > 0;
                        return (
                            <tr key={dia.fecha} className="bg-white hover:bg-slate-50">
                                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                                    <span className="inline-flex items-center gap-1.5">
                                        {formatFechaCorta(dia.fecha)}
                                        {hasAlertas && (
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                        )}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                                    {formatDiaCorto(dia.fecha)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-800">
                                    {formatHora(dia.entrada)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-800">
                                    {formatAlmuerzo(dia.almuerzoIda, dia.almuerzoVuelta)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-800">
                                    {formatSalida(dia.salida)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-900">
                                    {formatDuracion(dia.horasHechas)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-500">
                                    {formatDuracion(dia.horasLegales)}
                                </td>
                                <td className={`whitespace-nowrap px-3 py-2.5 font-mono tabular-nums ${duracionClass(extra, "extra")}`}>
                                    {formatDuracion(extra)}
                                </td>
                                <td className={`whitespace-nowrap px-3 py-2.5 font-mono tabular-nums ${duracionClass(deMenos, "menos")}`}>
                                    {formatDuracion(deMenos)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-slate-900">
                        <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500" colSpan={5}>
                            Totales
                        </td>
                        <td className="px-3 py-3 font-mono text-sm font-semibold tabular-nums">
                            {formatDuracion(hechasTotal)}
                        </td>
                        <td className="px-3 py-3 font-mono text-sm font-semibold tabular-nums text-slate-500">
                            {formatDuracion(legalesTotal)}
                        </td>
                        <td className={`px-3 py-3 font-mono text-sm font-semibold tabular-nums ${duracionClass(extrasTotal, "extra")}`}>
                            {formatDuracion(extrasTotal)}
                        </td>
                        <td className={`px-3 py-3 font-mono text-sm font-semibold tabular-nums ${duracionClass(deMenosTotal, "menos")}`}>
                            {formatDuracion(deMenosTotal)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
