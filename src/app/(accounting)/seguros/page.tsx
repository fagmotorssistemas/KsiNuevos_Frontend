'use client';

import { useState, useEffect, useMemo } from 'react';
import { contratosService } from "@/services/contratos.service";
import { ContratoDetalle } from "@/types/contratos.types";
import { useContratosData } from "@/hooks/useContratosData"; 
import { ShieldCheck, Loader2, Info, Eye } from 'lucide-react';
import { Card } from "@/components/ui/Card";

// Importación de tus componentes de detalle
import { ContratoDetails } from "@/components/features/contracts/ContratoDetails";

export default function SegurosPage() {
    const { contratos: listaNotas, loading: loadingLista } = useContratosData();
    
    const [detallesValidos, setDetallesValidos] = useState<ContratoDetalle[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progreso, setProgreso] = useState(0);

    // Estado para abrir el detalle de la nota
    const [selectedNotaId, setSelectedNotaId] = useState<string | null>(null);

    useEffect(() => {
        const procesarNotas = async () => {
            if (listaNotas.length === 0) return;
            
            setIsProcessing(true);
            const encontrados: ContratoDetalle[] = [];
            
            for (let i = 0; i < listaNotas.length; i++) {
                try {
                    // Usamos ccoCodigo para traer el detalle económico
                    const detalle = await contratosService.getDetalleContrato(listaNotas[i].ccoCodigo);
                    
                    const valorStr = detalle.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0";
                    const valorNum = parseFloat(valorStr);
                    
                    if (valorNum > 0) {
                        encontrados.push(detalle);
                    }
                } catch (error) {
                    // Evitamos que el console error detenga la ejecución de la página
                    console.warn(`Aviso: No se pudo procesar la nota ${listaNotas[i].notaVenta}.`, error);
                }
                setProgreso(Math.round(((i + 1) / listaNotas.length) * 100));
            }
            
            setDetallesValidos(encontrados);
            setIsProcessing(false);
        };

        if (!loadingLista) procesarNotas();
    }, [listaNotas, loadingLista]);

    const resumen = useMemo(() => {
        const totalDinero = detallesValidos.reduce((acc, curr) => {
            const valor = parseFloat(curr.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0");
            return acc + valor;
        }, 0);

        return {
            cantidad: detallesValidos.length,
            montoTotal: totalDinero
        };
    }, [detallesValidos]);

    if (loadingLista || (isProcessing && progreso < 5)) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-slate-500 font-medium">Sincronizando Notas de Venta...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Control de Seguros (Notas de Venta)</h1>
                    <p className="text-slate-500 text-sm italic">Auditoría de Rastreadores</p>
                </div>
                {isProcessing && (
                    <div className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100 flex items-center gap-3">
                        <span className="text-xs font-bold text-blue-700">Analizando: {progreso}%</span>
                    </div>
                )}
            </header>

            <Card className="p-0 overflow-hidden border-blue-200 shadow-lg shadow-blue-900/5">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-400">
                            <ShieldCheck size={36} />
                        </div>
                        <div>
                            <h2 className="text-white text-lg font-semibold opacity-90">Recaudación de Rastreadores</h2>
                            <p className="text-3xl font-bold text-blue-400">${resumen.montoTotal.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-xs font-medium uppercase">Total Notas</p>
                        <p className="text-3xl font-bold text-white">{resumen.cantidad}</p>
                    </div>
                </div>
            </Card>

            <Card className="border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-black border-b">
                            <tr>
                                <th className="px-6 py-4">Nota de Venta</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4 text-right">Monto Unitario</th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {detallesValidos.map((det) => (
                                <tr key={det.notaVenta} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{det.notaVenta}</td>
                                    <td className="px-6 py-4 uppercase font-semibold text-slate-800">{det.facturaNombre}</td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900">{det.totalRastreador}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setSelectedNotaId(det.ccoCodigo)}
                                            className="p-2 hover:bg-white border hover:border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Detalle que incluye Amortización */}
            {selectedNotaId && (
                <ContratoDetails 
                    contratoId={selectedNotaId} 
                    onClose={() => setSelectedNotaId(null)} 
                />
            )}
        </div>
    );
}