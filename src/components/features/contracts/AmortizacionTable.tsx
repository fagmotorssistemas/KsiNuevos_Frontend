// src/components/features/contracts/AmortizacionTable.tsx
import { useState, useEffect } from "react";
import { contratosService } from "@/services/contratos.service";
import { CuotaAmortizacion } from "@/types/contratos.types";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface AmortizacionTableProps {
    contratoId: string;
    printMode?: boolean; 
    totalCuotas?: number;
    // --- CAMBIO: Ahora recibe un array de cuotas para desglosarlas ---
    cuotasAdicionales?: Array<{
        monto: number;
        fecha: string;
    }>;
}

export function AmortizacionTable({ 
    contratoId, 
    printMode = false, 
    totalCuotas = 0,
    cuotasAdicionales = [] 
}: AmortizacionTableProps) {
    const [cuotas, setCuotas] = useState<CuotaAmortizacion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAmortizacion = async () => {
            try {
                setLoading(true);
                const data = await contratosService.getAmortizacion(contratoId);
                setCuotas(data);
            } catch (error) {
                console.error("Error loading amortization", error);
            } finally {
                setLoading(false);
            }
        };

        if (contratoId) {
            loadAmortizacion();
        }
    }, [contratoId]);

    // Total según las cuotas que realmente vienen (ej. 24 cuotas → "de 24", no "de 36")
    const total = cuotas.length > 0 ? cuotas.length : totalCuotas;
    const tieneAdicionales = cuotasAdicionales.length > 0;

    if (loading) {
        if (printMode) return <p className="text-xs">Cargando tabla...</p>;
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <span className="text-xs">Calculando tabla de pagos...</span>
            </div>
        );
    }

    if (cuotas.length === 0 && !tieneAdicionales) {
        if (printMode) return <div className="border border-black p-2 text-center font-bold">VENTA AL CONTADO - SIN CUOTAS</div>;
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <h4 className="text-emerald-800 font-semibold">Venta al Contado</h4>
            </div>
        );
    }

    // --- RENDERIZADO MODO IMPRESIÓN (PARA EL PDF/PÁGINA 6) ---
    if (printMode) {
        const cellPad = "py-0.5 print:py-[5px]";
        const headPad = "py-1 print:py-2";
        return (
            <div className="w-full print:pt-1 print:pb-2">
                <table className="w-full text-[9px] font-mono border-collapse border-b border-black print:break-inside-auto">
                    <thead className="print:table-header-group">
                        <tr className="border-t border-b border-black print:[break-inside:avoid]">
                            <th className={`text-left pl-1 font-bold w-[30%] ${headPad}`}>Detalle Cuota</th>
                            <th className={`text-left font-bold ${headPad}`}>F.Vence</th>
                            <th className={`text-right font-bold ${headPad}`}>Capital</th>
                            <th className={`text-right font-bold ${headPad}`}>Cuota</th>
                            <th className={`text-right pr-1 font-bold ${headPad}`}>Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* --- RENDERIZADO DE CADA CUOTA ADICIONAL POR SEPARADO --- */}
                        {cuotasAdicionales.map((ca, idx) => (
                            <tr key={`ca-print-${idx}`} className="border-b border-gray-300 border-dotted print:break-inside-avoid">
                                <td className={`pl-1 ${cellPad}`}>Cuota Adicional {idx + 1}</td>
                                <td className={cellPad}>{ca.fecha ? ca.fecha : '–'}</td>
                                <td className={`text-right ${cellPad}`}>${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className={`text-right font-bold ${cellPad}`}>${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className={`text-right pr-1 ${cellPad}`}>${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                        ))}

                        {/* --- CUOTAS NORMALES --- */}
                        {cuotas.map((row, index) => {
                            const label = `Cuota ${String(row.nroCuota).padStart(2, '0')} de ${total}`;
                            // El número de fila visual se desplaza según cuántas cuotas adicionales existan
                            const nroFilaVisual = index + 1 + cuotasAdicionales.length;
                            return (
                                <tr key={row.nroCuota} className="border-b border-gray-300 border-dotted print:break-inside-avoid">
                                    <td className={`pl-1 ${cellPad}`}>{nroFilaVisual} {label}</td>
                                    <td className={cellPad}>{row.fechaVencimiento}</td>
                                    <td className={`text-right ${cellPad}`}>${row.capital.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className={`text-right font-bold ${cellPad}`}>${row.valorCuota}</td>
                                    <td className={`text-right pr-1 ${cellPad}`}>${row.saldoCapital.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    // --- MODO PANTALLA (WEB) ---
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    Tabla de Amortización
                </h4>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-white text-slate-500 font-medium sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Vencimiento</th>
                            <th className="px-3 py-2 text-right">Capital</th>
                            <th className="px-3 py-2 text-right">Interés</th>
                            <th className="px-3 py-2 text-right">Cuota Total</th>
                            <th className="px-3 py-2 text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {/* Renderizado Web de Cuotas Adicionales */}
                        {cuotasAdicionales.map((ca, idx) => (
                            <tr key={`web-ca-${idx}`} className="bg-blue-50/50">
                                <td className="px-3 py-1.5 font-bold text-blue-700">Extra {idx + 1}</td>
                                <td className="px-3 py-1.5 text-slate-600">{ca.fecha ? ca.fecha : '–'}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-slate-600">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-slate-600">0.00</td>
                                <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-600">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-slate-500">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                        ))}
                        {cuotas.map((row) => (
                            <tr key={row.nroCuota} className="hover:bg-slate-50">
                                <td className="px-3 py-1.5 font-medium text-slate-700">{row.nroCuota}</td>
                                <td className="px-3 py-1.5 text-slate-600">{row.fechaVencimiento}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-slate-600">${row.capital.toLocaleString()}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-slate-600">{row.interes}</td>
                                <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-600">{row.valorCuota}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-slate-500">${row.saldoCapital.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}