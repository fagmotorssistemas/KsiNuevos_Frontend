import { useState, useEffect } from "react";
import { contratosService } from "@/services/contratos.service";
import { ContratoDetalle } from "@/types/contratos.types";
import { AmortizacionTable } from "./AmortizacionTable";
import { 
    X, Car, FileText, User, CreditCard, Loader2, 
    MapPin, Calendar, Shield, BadgeDollarSign, Briefcase, FileSignature 
} from "lucide-react";

interface ContratoDetailsProps {
    contratoId: string;
    initialData?: { nota: string, cliente: string };
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
                    <p className="text-sm text-slate-600 font-medium">Cargando ficha completa...</p>
                    {initialData && <p className="text-xs text-slate-400">{initialData.nota} - {initialData.cliente}</p>}
                </div>
            </div>
        );
    }

    if (!contrato) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Contrato {contrato.nroContrato}
                        </h2>
                        <p className="text-xs text-slate-500 flex gap-2">
                            <span className="font-mono bg-slate-200 px-1.5 rounded">{contrato.notaVenta}</span>
                            <span>•</span>
                            <span>{contrato.fechaVenta}</span>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">{contrato.vendedor || 'Vendedor no asignado'}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* --- BODY SCROLLABLE --- */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    
                    {/* SECCIÓN 1: DATOS LEGALES Y UBICACIÓN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <FileSignature className="h-3 w-3" /> Cláusulas de Fecha
                            </h3>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                <div className="text-xs text-slate-600">
                                    <span className="font-semibold text-slate-800">Fecha Texto:</span> {contrato.textoFecha}
                                </div>
                                <div className="text-xs text-slate-600">
                                    <span className="font-semibold text-slate-800">Dado en:</span> {contrato.textoFechaDado}
                                </div>
                                {contrato.textoFechaCr && (
                                    <div className="text-xs text-slate-600 border-t border-slate-200 pt-2 mt-1">
                                        <span className="font-semibold text-slate-800">Fecha CR:</span> {contrato.textoFechaCr}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> Ubicaciones
                            </h3>
                            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2 shadow-sm">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Ciudad Contrato</p>
                                    <p className="text-sm font-medium text-slate-800">{contrato.ciudadContrato || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Ciudad Cliente</p>
                                    <p className="text-sm font-medium text-slate-800">{contrato.ciudadCliente || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: CLIENTE Y VEHÍCULO EXTENDIDO */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Columna Cliente (4/12) */}
                        <div className="md:col-span-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <User className="h-3 w-3" /> Facturación
                            </h3>
                            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm text-sm space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500">Razón Social</p>
                                    <p className="font-semibold text-slate-800">{contrato.facturaNombre}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-slate-500">RUC/CI</p>
                                        <p className="font-mono text-slate-700">{contrato.facturaRuc}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Teléfono</p>
                                        <p className="text-slate-700">{contrato.facturaTelefono}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Dirección</p>
                                    <p className="text-slate-700 text-xs">{contrato.facturaDireccion}</p>
                                </div>
                                {contrato.apoderado && contrato.apoderado !== 'N/A' && (
                                    <div className="pt-2 border-t border-slate-100 mt-2">
                                        <p className="text-xs text-slate-500">Apoderado</p>
                                        <p className="text-slate-700 font-medium">{contrato.apoderado}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Columna Vehículo (8/12) */}
                        <div className="md:col-span-8 space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Car className="h-3 w-3" /> Datos del Vehículo
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Marca", value: contrato.marca },
                                    { label: "Modelo", value: contrato.modelo },
                                    { label: "Tipo", value: contrato.tipoVehiculo },
                                    { label: "Color", value: contrato.color },
                                    { label: "Año Modelo", value: contrato.anio },
                                    { label: "Año Fab.", value: contrato.anioFabricacion },
                                    { label: "Placa", value: contrato.placa },
                                    { label: "Sistema", value: contrato.sistemaNombre },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                                        <p className="text-[10px] text-slate-400 uppercase font-medium">{item.label}</p>
                                        <p className="text-xs font-semibold text-slate-800 truncate" title={item.value}>
                                            {item.value || '-'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {/* Motor y Chasis destacados */}
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="bg-white border border-slate-200 p-2 px-3 rounded flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Motor:</span>
                                    <span className="text-sm font-mono font-medium">{contrato.motor}</span>
                                </div>
                                <div className="bg-white border border-slate-200 p-2 px-3 rounded flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Chasis:</span>
                                    <span className="text-sm font-mono font-medium">{contrato.chasis}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: DETALLE ECONÓMICO COMPLETO */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <BadgeDollarSign className="h-3 w-3" /> Detalle Económico y Valores en Letras
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
                            
                            {/* Desglose Izquierdo */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-600">Precio Vehículo</span>
                                        <span className="text-base font-semibold text-slate-900">${contrato.precioVehiculo?.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic mt-0.5 uppercase tracking-wide">
                                        {contrato.precioVehiculoLetras}
                                    </p>
                                </div>

                                <div className="border-t border-slate-200 pt-2">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-600">Gastos Administrativos</span>
                                        <span className="text-sm font-medium text-slate-900">${contrato.gastosAdministrativos?.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                {contrato.precioGastos > 0 && contrato.precioGastos !== contrato.gastosAdministrativos && (
                                     <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-600">Otros Gastos</span>
                                        <span className="text-sm font-medium text-slate-900">${contrato.precioGastos?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Totales Derecho */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Total Final</span>
                                        <span className="text-xl font-bold text-blue-600">{contrato.totalFinal}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right uppercase leading-tight">
                                        SON: {contrato.totalLetras}
                                    </p>
                                </div>

                                <div className="border-t border-slate-100 pt-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Pagaré</span>
                                        <span className="text-sm font-bold text-slate-700">Según Tabla</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right uppercase leading-tight">
                                        SON: {contrato.totalPagareLetras}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3.5: PAGOS Y RECEPCIONES (NUEVO) */}
                    {/* Solo se muestra si existen montos mayores a 0 */}
                    {(contrato.montoVehiculoUsado > 0 || contrato.montoCuotaAdicional > 0) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="h-3 w-3" /> Pagos y Recepciones
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* Bloque: Vehículo Recibido (Verde) */}
                                {contrato.montoVehiculoUsado > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                                        <p className="text-xs text-emerald-800 font-bold uppercase mb-1">
                                            Vehículo recibido como parte de pago
                                        </p>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-sm font-bold text-emerald-900">
                                                ${contrato.montoVehiculoUsado.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-emerald-700 leading-tight uppercase">
                                            SON: {contrato.letrasVehiculoUsado}
                                        </p>
                                    </div>
                                )}

                                {/* Bloque: Cuota Adicional / Dispositivo (Azul) */}
                                {contrato.montoCuotaAdicional > 0 && (
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                        <p className="text-xs text-blue-800 font-bold uppercase mb-1">
                                            Cuota Adicional / Dispositivo
                                        </p>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-sm font-bold text-blue-900">
                                                ${contrato.montoCuotaAdicional.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-blue-700 leading-tight uppercase">
                                            SON: {contrato.letrasCuotaAdicional}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 4: EXTRAS Y SEGUROS */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="h-3 w-3" /> Servicios Adicionales
                        </h3>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-blue-800 font-semibold mb-1">Seguro / Rastreo / Gast. Adm</p>
                                <p className="text-xs text-slate-600">{contrato.seguroRastreo || 'No especificado'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-800 font-semibold mb-1">Total Seguro</p>
                                <p className="text-sm font-medium text-slate-800">{contrato.totalSeguro || '$0.00'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-800 font-semibold mb-1">Total Rastreador</p>
                                <p className="text-sm font-medium text-slate-800">{contrato.totalRastreador || '$0.00'}</p>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 5: OBSERVACIONES */}
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

                    {/* SECCIÓN 6: AMORTIZACIÓN */}
                    <div className="pt-2 border-t border-slate-200">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                            <Briefcase className="h-3 w-3" /> Tabla de Amortización
                        </h3>
                        <AmortizacionTable contratoId={contrato.ccoCodigo} />
                    </div>

                </div>
            </div>
        </div>
    );
}