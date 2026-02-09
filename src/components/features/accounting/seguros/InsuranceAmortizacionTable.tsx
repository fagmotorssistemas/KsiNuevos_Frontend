// src/components/features/rastreadores/InsuranceAmortizacionTable.tsx
import { useState, useEffect } from "react";
import { contratosService } from "@/services/contratos.service";
import { CuotaAmortizacion } from "@/types/contratos.types";
import { 
    Loader2, 
    AlertCircle, 
    CheckCircle2, 
    CalendarDays 
} from "lucide-react";

interface InsuranceAmortizacionTableProps {
    contratoId: string;
    totalCuotas?: number;
    cuotasAdicionales?: Array<{
        monto: number;
        fecha: string;
    }>;
}

export function InsuranceAmortizacionTable({ 
    contratoId, 
    totalCuotas = 0,
    cuotasAdicionales = [] 
}: InsuranceAmortizacionTableProps) {
    const [cuotas, setCuotas] = useState<CuotaAmortizacion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAmortizacion = async () => {
            try {
                setLoading(true);
                const data = await contratosService.getAmortizacion(contratoId);
                setCuotas(data);
            } catch (error) {
                console.error("Error cargando tabla de seguros", error);
            } finally {
                setLoading(false);
            }
        };

        if (contratoId) loadAmortizacion();
    }, [contratoId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-300 bg-white rounded-2xl border border-slate-100">
                <Loader2 className="h-6 w-6 animate-spin mb-4 text-slate-900" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Cronograma</span>
            </div>
        );
    }

    if (cuotas.length === 0 && cuotasAdicionales.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-slate-100 text-center">
                <CheckCircle2 className="h-10 w-10 text-slate-900 mb-4 opacity-10" />
                <h4 className="text-slate-900 font-black uppercase text-[10px] tracking-widest">Venta al Contado</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">No existen cuotas pendientes</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all">
            {/* Header: Blanco con bordes sutiles */}
            <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-slate-50">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CalendarDays size={14} className="text-slate-300" />
                    Cronograma de Pagos
                </h4>
                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    ID: {contratoId}
                </span>
            </div>
            
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-white text-slate-400 font-black sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 uppercase text-[9px] tracking-widest">Nro</th>
                            <th className="px-6 py-4 uppercase text-[9px] tracking-widest">Vencimiento</th>
                            <th className="px-6 py-4 text-right uppercase text-[9px] tracking-widest">Capital</th>
                            <th className="px-6 py-4 text-right uppercase text-[9px] tracking-widest">Interés</th>
                            <th className="px-6 py-4 text-right uppercase text-[9px] tracking-widest">Cuota Total</th>
                            <th className="px-6 py-4 text-right uppercase text-[9px] tracking-widest">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {/* Cuotas Adicionales: Estilo monocromático itálico */}
                        {cuotasAdicionales.map((ca, idx) => (
                            <tr key={`extra-${idx}`} className="group hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3.5 font-black text-slate-900">E-{idx + 1}</td>
                                <td className="px-6 py-3.5 text-slate-500 font-medium">{ca.fecha}</td>
                                <td className="px-6 py-3.5 text-right font-mono text-slate-400">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                <td className="px-6 py-3.5 text-right font-mono text-slate-300">0.00</td>
                                <td className="px-6 py-3.5 text-right font-mono font-black text-slate-900">${ca.monto.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                <td className="px-6 py-3.5 text-right font-mono text-slate-300 italic text-[10px]">Adicional</td>
                            </tr>
                        ))}

                        {/* Cuotas Ordinarias: Limpias y espaciadas */}
                        {cuotas.map((row) => (
                            <tr key={row.nroCuota} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-3.5 font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                                    {String(row.nroCuota).padStart(2, '0')}
                                </td>
                                <td className="px-6 py-3.5 text-slate-600 font-medium">{row.fechaVencimiento}</td>
                                <td className="px-6 py-3.5 text-right font-mono text-slate-500">${row.capital.toLocaleString()}</td>
                                <td className="px-6 py-3.5 text-right font-mono text-slate-400">{row.interes}</td>
                                <td className="px-6 py-3.5 text-right font-mono font-black text-slate-900">${row.valorCuota}</td>
                                <td className="px-6 py-3.5 text-right font-mono text-slate-400 font-medium">${row.saldoCapital.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="bg-white p-4 border-t border-slate-50 text-center">
                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <AlertCircle size={10} /> Auditoría interna de seguros y rastreo.
                </p>
            </div>
        </div>
    );
}