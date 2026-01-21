import { useState, useEffect } from "react";
import { contratosService } from "@/services/contratos.service";
import { ContratoDetalle } from "@/types/contratos.types";
import { AmortizacionTable } from "./AmortizacionTable";
import { X, Car, FileText, User, CreditCard, Loader2 } from "lucide-react";

interface ContratoDetailsProps {
    contratoId: string; // Solo recibimos el ID
    initialData?: { nota: string, cliente: string }; // Opcional: datos para mostrar en el header mientras carga
    onClose: () => void;
}

export function ContratoDetails({ contratoId, initialData, onClose }: ContratoDetailsProps) {
    const [contrato, setContrato] = useState<ContratoDetalle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetalle = async () => {
            try {
                setLoading(true);
                const data = await contratosService.getDetalleContrato(contratoId);
                setContrato(data);
            } catch (error) {
                console.error("Error cargando detalle", error);
            } finally {
                setLoading(false);
            }
        };

        if (contratoId) {
            loadDetalle();
        }
    }, [contratoId]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3 shadow-xl">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-sm text-slate-600 font-medium">Cargando ficha del contrato...</p>
                    {initialData && <p className="text-xs text-slate-400">{initialData.nota} - {initialData.cliente}</p>}
                </div>
            </div>
        );
    }

    if (!contrato) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Contrato {contrato.nroContrato}
                        </h2>
                        <p className="text-xs text-slate-500">{contrato.notaVenta} • {contrato.fechaVenta}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Body Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* Fila 1: Cliente y Datos Financieros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cliente */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <User className="h-3 w-3" /> Cliente Facturación
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
                                <div className="flex justify-between border-b border-slate-200 pb-1 mb-1">
                                    <span className="text-slate-500">Razon Social:</span>
                                    <span className="font-semibold text-slate-700">{contrato.facturaNombre}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">RUC/CI:</span>
                                    <span className="font-mono text-slate-700">{contrato.facturaRuc}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Teléfono:</span>
                                    <span className="text-slate-700">{contrato.facturaTelefono}</span>
                                </div>
                                <div className="mt-2 text-xs text-slate-500 italic">
                                    {contrato.facturaDireccion}
                                </div>
                            </div>
                        </div>

                        {/* Totales */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="h-3 w-3" /> Resumen Económico
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Precio Vehículo:</span>
                                    <span className="font-semibold">${contrato.precioVehiculo?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Gastos Adm:</span>
                                    <span className="font-semibold">{contrato.gastosAdministrativos}</span>
                                </div>
                                <div className="flex justify-between pt-2 mt-2 border-t border-slate-200">
                                    <span className="font-bold text-slate-800">TOTAL FINAL:</span>
                                    <span className="font-bold text-blue-600 text-lg">{contrato.totalFinal}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Vehículo (Grid ordenado) */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Car className="h-3 w-3" /> Ficha Técnica
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: "Marca", value: contrato.marca },
                                { label: "Modelo", value: contrato.modelo },
                                { label: "Año", value: contrato.anio },
                                { label: "Color", value: contrato.color },
                                { label: "Placa", value: contrato.placa },
                                { label: "Motor", value: contrato.motor },
                                { label: "Chasis", value: contrato.chasis },
                                { label: "Tipo", value: contrato.tipoVehiculo },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-medium">{item.label}</p>
                                    <p className="text-xs font-semibold text-slate-800 truncate" title={item.value}>{item.value || '-'}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fila 3: Observaciones */}
                    {(contrato.observaciones || contrato.formaPago) && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-xs space-y-2 text-amber-900">
                            {contrato.observaciones && (
                                <p><span className="font-bold">Observaciones:</span> {contrato.observaciones}</p>
                            )}
                            {contrato.formaPago && (
                                <p><span className="font-bold">Forma de Pago:</span> {contrato.formaPago}</p>
                            )}
                        </div>
                    )}

                    {/* Fila 4: Amortización (Ya existente) */}
                    <div className="pt-2">
                        <AmortizacionTable contratoId={contrato.ccoCodigo} />
                    </div>

                </div>
            </div>
        </div>
    );
}