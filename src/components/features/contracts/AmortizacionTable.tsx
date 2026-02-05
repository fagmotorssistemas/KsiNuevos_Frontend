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

    const total = totalCuotas || cuotas.length;
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
        return (
            <div className="w-full">
                <table className="w-full text-[9px] font-mono border-collapse border-b border-black">
                    <thead>
                        <tr className="border-t border-b border-black">
                            <th className="text-left py-1 pl-1 font-bold w-[30%]">Detalle Cuota</th>
                            <th className="text-left py-1 font-bold">F.Vence</th>
                            <th className="text-right py-1 font-bold">Capital</th>
                            <th className="text-right py-1 font-bold">Cuota</th>
                            <th className="text-right py-1 pr-1 font-bold">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* --- RENDERIZADO DE CADA CUOTA ADICIONAL POR SEPARADO --- */}
                        {cuotasAdicionales.map((ca, idx) => (
                            <tr key={`ca-print-${idx}`} className="border-b border-gray-300 border-dotted">
                                <td className="py-0.5 pl-1">Cuota Adicional {idx + 1}</td>
                                <td className="py-0.5">{ca.fecha}</td>
                                <td className="py-0.5 text-right">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="py-0.5 text-right font-bold">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="py-0.5 text-right pr-1">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                        ))}

                        {/* --- CUOTAS NORMALES --- */}
                        {cuotas.map((row, index) => {
                            const label = `Cuota ${String(row.nroCuota).padStart(2, '0')} de ${total}`;
                            // El número de fila visual se desplaza según cuántas cuotas adicionales existan
                            const nroFilaVisual = index + 1 + cuotasAdicionales.length;
                            return (
                                <tr key={row.nroCuota} className="border-b border-gray-300 border-dotted">
                                    <td className="py-0.5 pl-1">{nroFilaVisual} {label}</td>
                                    <td className="py-0.5">{row.fechaVencimiento}</td>
                                    <td className="py-0.5 text-right">${row.capital.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="py-0.5 text-right font-bold">${row.valorCuota}</td>
                                    <td className="py-0.5 text-right pr-1">${row.saldoCapital.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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
                                <td className="px-3 py-1.5 text-slate-600">{ca.fecha}</td>
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