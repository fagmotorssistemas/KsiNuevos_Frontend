import { useState, useEffect } from "react";
import { contratosService } from "@/services/contratos.service";
import { CuotaAmortizacion } from "@/types/contratos.types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface AmortizacionTableProps {
    contratoId: string;
}

export function AmortizacionTable({ contratoId }: AmortizacionTableProps) {
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <span className="text-xs">Calculando tabla de pagos...</span>
            </div>
        );
    }

    // CASO CRÍTICO: Array vacío = Venta al Contado
    if (cuotas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <h4 className="text-emerald-800 font-semibold">Venta al Contado</h4>
                <p className="text-xs text-emerald-600">Este contrato no registra cuotas pendientes ni tabla de amortización.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    Tabla de Amortización ({cuotas.length} Cuotas)
                </h4>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-white text-slate-500 font-medium sticky top-0 shadow-sm">
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