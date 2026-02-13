'use client';

import { useState, useEffect, useMemo } from 'react';
import { contratosService } from "@/services/contratos.service";
import { ContratoDetalle } from "@/types/contratos.types";
import { useContratosData } from "@/hooks/useContratosData"; 
import { Loader2 } from 'lucide-react';

// Componentes del módulo
import { ProcessingStatus } from "@/components/features/accounting/seguros/ProcessingStatus";
import { MetricsGrid } from "@/components/features/accounting/seguros/MetricsGrid";
import { InsuranceTable } from "@/components/features/accounting/seguros/InsuranceTable";
import { InsuranceContratoDetails } from '@/components/features/accounting/seguros/InsuranceContratoDetails';

type FilterType = 'rastreador' | 'seguro' | 'ambos';

export default function SegurosPage() {
    const { contratos: listaNotas, loading: loadingLista } = useContratosData();
    
    // Estados para almacenar detalles procesados
    const [detallesRastreador, setDetallesRastreador] = useState<ContratoDetalle[]>([]);
    const [detallesSeguro, setDetallesSeguro] = useState<ContratoDetalle[]>([]);
    const [detallesAmbos, setDetallesAmbos] = useState<ContratoDetalle[]>([]);
    
    // Estados de control de UI
    const [isProcessing, setIsProcessing] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('rastreador');

    // --- ESTADO UNIFICADO: GESTIÓN INTEGRAL ---
    // Ya no distinguimos entre "lectura" y "auditoría". 
    const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null);

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
                        return await contratosService.getDetalleContrato(nota.ccoCodigo); 
                    } catch { 
                        return null; 
                    } finally {
                        completados++;
                        setProgreso(Math.round((completados / total) * 100));
                    }
                });

                const resultados = await Promise.all(promesas);
                
                // Categorización de resultados
                setDetallesRastreador(resultados.filter((det): det is ContratoDetalle => 
                    parseFloat(det?.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0") > 0
                ));

                setDetallesSeguro(resultados.filter((det): det is ContratoDetalle => 
                    parseFloat(det?.totalSeguro?.toString().replace(/[^0-9.]/g, '') || "0") > 0
                ));

                setDetallesAmbos(resultados.filter((det): det is ContratoDetalle => {
                    if (!det) return false;
                    const r = parseFloat(det.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0");
                    const s = parseFloat(det.totalSeguro?.toString().replace(/[^0-9.]/g, '') || "0");
                    return r > 0 && s > 0;
                }));
            } finally {
                setTimeout(() => setIsProcessing(false), 500);
            }
        };

        if (!loadingLista) procesarNotas();
    }, [listaNotas, loadingLista]);

    // Cálculo de métricas
    const metricas = useMemo(() => ({
        rastreador: {
            cant: detallesRastreador.length,
            total: detallesRastreador.reduce((a, b) => a + parseFloat(b.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0"), 0)
        },
        seguro: {
            cant: detallesSeguro.length,
            total: detallesSeguro.reduce((a, b) => a + parseFloat(b.totalSeguro?.toString().replace(/[^0-9.]/g, '') || "0"), 0)
        },
        ambos: {
            cant: detallesAmbos.length,
            total: detallesAmbos.reduce((a, b) => {
                const r = parseFloat(b.totalRastreador?.toString().replace(/[^0-9.]/g, '') || "0");
                const s = parseFloat(b.totalSeguro?.toString().replace(/[^0-9.]/g, '') || "0");
                return a + r + s;
            }, 0)
        }
    }), [detallesRastreador, detallesSeguro, detallesAmbos]);

    // Filtrado
    const filteredData = useMemo(() => {
        const base = activeFilter === 'rastreador' ? detallesRastreador : 
                     activeFilter === 'seguro' ? detallesSeguro : detallesAmbos;
        
        return base.filter(item => 
            item.notaVenta.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.facturaNombre?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [activeFilter, detallesRastreador, detallesSeguro, detallesAmbos, searchTerm]);

    if (loadingLista) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <Loader2 className="animate-spin text-slate-400" size={32} />
            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Cargando base de datos...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 bg-slate-50/30 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 tracking-tight">
                        Panel de <span className="font-bold text-slate-900">Seguros y Rastreadores</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Hoja de servicio unificada y gestión técnica.</p>
                </div>
                <ProcessingStatus isProcessing={isProcessing} progreso={progreso} />
            </header>

            <MetricsGrid 
                activeFilter={activeFilter} 
                setActiveFilter={setActiveFilter} 
                metrics={metricas} 
            />

            <InsuranceTable 
                data={filteredData} 
                activeFilter={activeFilter} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                onManage={setSelectedContratoId} // Única acción: Gestionar
            />

            {/* MODAL UNIFICADO: GESTIÓN INTEGRAL */}
            {selectedContratoId && (
                <InsuranceContratoDetails 
                    contratoId={selectedContratoId} 
                    onClose={() => setSelectedContratoId(null)} 
                    activeFilter={activeFilter} 
                />
            )}
        </div>
    );
}