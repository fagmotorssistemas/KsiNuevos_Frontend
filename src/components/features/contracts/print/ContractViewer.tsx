// src/components/features/contracts/ContractViewer.tsx
import { useState, useEffect, useRef } from "react";
import { Printer, Loader2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { contratosService } from "@/services/contratos.service";
import { ContratoDetalle, CuotaAmortizacion } from "@/types/contratos.types";
import { ContractDocument } from "./ContractDocument";

interface ContractViewerProps {
    contratoId: string;
    onClose: () => void;
}

export function ContractViewer({ contratoId, onClose }: ContractViewerProps) {
    const [contrato, setContrato] = useState<ContratoDetalle | null>(null);
    const [amortizacion, setAmortizacion] = useState<CuotaAmortizacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [fechaImpresion, setFechaImpresion] = useState<string>("");

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [detalleData, amortizacionData] = await Promise.all([
                    contratosService.getDetalleContrato(contratoId),
                    contratosService.getAmortizacion(contratoId)
                ]);
                
                setContrato(detalleData);
                setAmortizacion(amortizacionData);
            } catch (error) {
                console.error("Error al cargar datos del contrato", error);
                alert("Error cargando los datos del contrato");
                onClose();
            } finally {
                setLoading(false);
            }
        };

        if (contratoId) loadData();
    }, [contratoId, onClose]);

    const handlePrint = useReactToPrint({
        contentRef: contentRef,
        documentTitle: `Contrato_${contrato?.nroContrato || 'Documento'}`,
        pageStyle: `
            @page { size: A4 portrait; margin: 0mm !important; }
            @media print {
                html, body {
                    width: 210mm;
                    height: 297mm;
                    margin: 0 !important;
                    padding: 0 !important;
                    -webkit-font-smoothing: antialiased;
                    text-rendering: optimizeLegibility;
                }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `
    });

    const handlePrintWithTimestamp = () => {
        const ahora = new Date();
        const timestamp = ahora.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        
        setFechaImpresion(timestamp);

        setTimeout(() => {
            handlePrint();
        }, 150);
    };

    if (loading) {
        return (
            /* Restaurado: fixed inset-0 para que cubra toda la pantalla */
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-slate-600 font-medium">Generando contrato...</p>
                </div>
            </div>
        );
    }

    if (!contrato) return null;

    return (
        /* CLAVE: 'fixed inset-0 z-50' hace que el visor oculte el dashboard */
        <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in duration-200 overflow-hidden">
            
            {/* Barra Superior - Se mantiene visible arriba */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 uppercase">
                        VISOR DE CONTRATO: {contrato.nroContrato}
                    </h2>
                    <p className="text-sm text-slate-500">
                        Previsualización de documentos para {contrato.facturaNombre}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePrintWithTimestamp}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir Contrato
                    </button>
                </div>
            </div>

            {/* Área de Visualización - Scroll independiente para ver las páginas */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50">
                <div 
                    ref={contentRef} 
                    className="mx-auto w-fit bg-white shadow-2xl print:shadow-none mb-10"
                    style={{ 
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        WebkitFontSmoothing: 'antialiased'
                    }}
                >
                    <ContractDocument 
                        data={contrato} 
                        amortizacion={amortizacion} 
                        fechaImpresion={fechaImpresion} 
                    />
                </div>
            </div>
        </div>
    );
}