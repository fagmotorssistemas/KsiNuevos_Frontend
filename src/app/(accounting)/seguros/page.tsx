'use client';

import { useState, useEffect, useMemo } from 'react';
import { contratosService } from "@/services/contratos.service";
import { ContratoDetalle } from "@/types/contratos.types";
import { useContratosData } from "@/hooks/useContratosData"; 
import { ShieldCheck, Loader2, Eye, LayoutDashboard, Activity } from 'lucide-react';
import { Card } from "@/components/ui/Card";

// Importación de componentes de detalle
import { ContratoDetails } from "@/components/features/contracts/ContratoDetails";

export default function SegurosPage() {
    const { contratos: listaNotas, loading: loadingLista } = useContratosData();
    
    const [detallesValidos, setDetallesValidos] = useState<ContratoDetalle[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [selectedNotaId, setSelectedNotaId] = useState<string | null>(null);

    useEffect(() => {
        const procesarNotas = async () => {
            if (listaNotas.length === 0) return;
            
            setIsProcessing(true);
            setProgreso(0);

            let completados = 0;
            const total = listaNotas.length;

            try {
                const promesas = listaNotas.map(async (nota) => {
                    try {
                        const detalle = await contratosService.getDetalleContrato(nota.ccoCodigo);
                        return detalle;
                    } catch (error) {
                        console.warn(`Aviso: No se pudo procesar la nota ${nota.notaVenta}.`, error);
                        return null;
                    } finally {
                        completados++;
                        setProgreso(Math.round((completados / total) * 100));
                    }
                });

                const resultados = await Promise.all(promesas);
                
                const encontrados = resultados.filter((det): det is ContratoDetalle => {
                    if (!det) return false;
                    const valorStr = det.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0";
                    return parseFloat(valorStr) > 0;
                });

                setDetallesValidos(encontrados);
            } catch (error) {
                console.error("Error crítico:", error);
            } finally {
                setTimeout(() => setIsProcessing(false), 500);
            }
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

    if (loadingLista) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-slate-500 font-medium">Cargando base de datos...</p>
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
                        <div className="w-20 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-600 transition-all duration-300" 
                                style={{ width: `${progreso}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-blue-700">Sincronizando: {progreso}%</span>
                    </div>
                )}
            </header>

            {/* Grid de 3 Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tarjeta 1: Recaudación Real */}
                <Card className="p-0 overflow-hidden border-blue-200 shadow-lg shadow-blue-900/5">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-400">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Recaudación Total</p>
                                <h2 className="text-white text-lg font-semibold">Rastreadores</h2>
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <p className="text-3xl font-bold text-blue-400">${resumen.montoTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <div className="text-right">
                                <p className="text-slate-500 text-[10px] uppercase font-bold">Cant. Notas</p>
                                <p className="text-xl font-bold text-white">{resumen.cantidad}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Tarjeta 2: Placeholder */}
                <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
                    <div className="bg-white p-6 h-full flex flex-col justify-between border-l-4 border-slate-400">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-slate-100 rounded-xl text-slate-400">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Módulo en espera</p>
                                <h2 className="text-slate-800 text-lg font-semibold">Tarjeta 2</h2>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm italic">Información pendiente de configurar...</p>
                    </div>
                </Card>

                {/* Tarjeta 3: Placeholder */}
                <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
                    <div className="bg-white p-6 h-full flex flex-col justify-between border-l-4 border-slate-400">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-slate-100 rounded-xl text-slate-400">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Módulo en espera</p>
                                <h2 className="text-slate-800 text-lg font-semibold">Tarjeta 3</h2>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm italic">Información pendiente de configurar...</p>
                    </div>
                </Card>
            </div>

            <Card className="border-slate-200">
                {/* ... resto de tu tabla ... */}
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
                                    <td className="px-6 py-4 text-right font-black text-slate-900">
                                        {(() => {
                                            const n = typeof det.totalRastreador === 'number' 
                                                ? det.totalRastreador 
                                                : parseFloat(det.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0");
                                            return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                                        })()}
                                    </td>
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

            {selectedNotaId && (
                <ContratoDetails 
                    contratoId={selectedNotaId} 
                    onClose={() => setSelectedNotaId(null)} 
                />
            )}
        </div>
    );
}