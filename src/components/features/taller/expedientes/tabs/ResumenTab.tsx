import React, { useState, useEffect } from "react";
import { User, Clock, DollarSign, Loader2 } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface ResumenTabProps {
    orden: OrdenTrabajo;
    onUpdateContable: (id: string, status: string) => void;
}

export function ResumenTab({ orden, onUpdateContable }: ResumenTabProps) {
    // @ts-ignore
    const [localEstadoContable, setLocalEstadoContable] = useState(orden.estado_contable || 'pendiente');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // @ts-ignore
        setLocalEstadoContable(orden.estado_contable || 'pendiente');
    }, [orden]);

    const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nuevoEstado = e.target.value;
        setLocalEstadoContable(nuevoEstado);
        setIsUpdating(true);
        await onUpdateContable(orden.id, nuevoEstado);
        setIsUpdating(false);
    };

    const getContableColor = (estado: string) => {
        switch(estado) {
            case 'pendiente': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'facturado': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'pagado': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'anulado': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            {/* Tarjeta Cliente */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                    <User className="h-4 w-4 text-slate-400" /> Datos del Cliente
                </h3>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</p>
                        <p className="font-medium text-slate-800">{orden.cliente?.nombre_completo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Teléfono</p>
                            <p className="text-sm text-slate-700">{orden.cliente?.telefono || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                            <p className="text-sm text-slate-700">{orden.cliente?.email || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjeta Tiempos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                    <Clock className="h-4 w-4 text-slate-400" /> Línea de Tiempo
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Ingreso:</span>
                        <span className="font-bold text-slate-800">{new Date(orden.fecha_ingreso).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Salida:</span>
                        {orden.fecha_salida_real ? (
                            <span className="font-bold text-emerald-600">{new Date(orden.fecha_salida_real).toLocaleDateString()}</span>
                        ) : (
                            <span className="font-bold text-amber-500 text-sm flex items-center gap-1">En taller</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tarjeta Estado Contable (NUEVO) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                    <DollarSign className="h-4 w-4 text-slate-400" /> Estado Financiero
                </h3>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Estado Actual</p>
                        
                        <div className="flex items-center gap-3">
                            <select 
                                value={localEstadoContable}
                                onChange={handleEstadoChange}
                                disabled={isUpdating}
                                className={`w-full p-3 rounded-xl border text-sm font-bold outline-none cursor-pointer disabled:opacity-50 transition-colors ${getContableColor(localEstadoContable)}`}
                            >
                                <option value="pendiente" className="text-amber-600 bg-white">Pendiente de Pago</option>
                                <option value="facturado" className="text-blue-600 bg-white">Facturado</option>
                                <option value="pagado" className="text-emerald-600 bg-white">Pagado</option>
                                <option value="anulado" className="text-red-600 bg-white">Anulado</option>
                            </select>
                            {isUpdating && <Loader2 className="h-5 w-5 animate-spin text-slate-400 flex-shrink-0" />}
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500">
                            {localEstadoContable === 'pendiente' && "El cliente aún no ha realizado el pago por esta orden."}
                            {localEstadoContable === 'facturado' && "Facturado desde contabilidad"}
                            {localEstadoContable === 'pagado' && "El dinero ha sido recaudado exitosamente."}
                            {localEstadoContable === 'anulado' && "Esta orden o factura ha sido cancelada financieramente."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}