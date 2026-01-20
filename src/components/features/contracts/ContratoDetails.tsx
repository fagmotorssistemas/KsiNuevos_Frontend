import { ContratoDetalle } from "@/types/contratos.types";
import { AmortizacionTable } from "./AmortizacionTable";
import { X, Car, FileText, User, CreditCard } from "lucide-react";

interface ContratoDetailsProps {
    contrato: ContratoDetalle;
    onClose: () => void;
}

export function ContratoDetails({ contrato, onClose }: ContratoDetailsProps) {
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
                    
                    {/* Sección 1: Cliente y Facturación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <User className="h-3 w-3" /> Datos del Cliente
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
                                <p><span className="font-semibold text-slate-700">Nombre:</span> {contrato.cliente}</p>
                                <p><span className="font-semibold text-slate-700">RUC/CI:</span> {contrato.facturaRuc}</p>
                                <p><span className="font-semibold text-slate-700">Dirección:</span> {contrato.facturaDireccion}</p>
                                <p><span className="font-semibold text-slate-700">Teléfono:</span> {contrato.facturaTelefono}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="h-3 w-3" /> Datos Financieros
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Precio Vehículo:</span>
                                    <span className="font-semibold">${contrato.precioVehiculo.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Gastos Adm:</span>
                                    <span className="font-semibold">{contrato.gastosAdministrativos}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200">
                                    <span className="font-bold text-slate-800">Total Final:</span>
                                    <span className="font-bold text-blue-600 text-lg">{contrato.totalFinal}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 italic mt-1">{contrato.totalLetras}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Vehículo (Data Dura) */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Car className="h-3 w-3" /> Información del Vehículo
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

                    {/* Sección 3: Observaciones y Textos Legales */}
                    {(contrato.observaciones || contrato.formaPago || contrato.vehiculoUsado) && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-xs space-y-2 text-amber-900">
                            {contrato.observaciones && <p><strong>Observaciones:</strong> {contrato.observaciones}</p>}
                            {contrato.formaPago && <p><strong>Forma de Pago:</strong> {contrato.formaPago}</p>}
                            {contrato.vehiculoUsado && <p><strong>Retoma:</strong> {contrato.vehiculoUsado}</p>}
                        </div>
                    )}

                    {/* Sección 4: Tabla de Amortización Dinámica */}
                    <div className="pt-2">
                        <AmortizacionTable contratoId={contrato.ccoCodigo} />
                    </div>

                </div>
            </div>
        </div>
    );
}