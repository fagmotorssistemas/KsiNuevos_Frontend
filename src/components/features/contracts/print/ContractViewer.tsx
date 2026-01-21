// src/components/features/contracts/ContractViewer.tsx
import { useState, useEffect } from "react";
import { X, Printer, Loader2 } from "lucide-react";
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

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Cargamos ambos datos en paralelo: detalle del contrato y amortización
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

        if (contratoId) {
            loadData();
        }
    }, [contratoId, onClose]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-slate-600 font-medium">Generando contrato...</p>
                </div>
            </div>
        );
    }

    if (!contrato) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in duration-200 overflow-hidden">
            
            {/* Barra Superior - NO SE IMPRIME (print:hidden) */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm print:hidden shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Vista Previa del Contrato</h2>
                    <p className="text-sm text-slate-500">{contrato.nroContrato} • {contrato.facturaNombre}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir Contrato
                    </button>
                </div>
            </div>

            {/* Área de Visualización del Documento */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
                <div className="mx-auto print:w-full print:mx-0">
                    <ContractDocument data={contrato} amortizacion={amortizacion} />
                </div>
            </div>
        </div>
    );
}