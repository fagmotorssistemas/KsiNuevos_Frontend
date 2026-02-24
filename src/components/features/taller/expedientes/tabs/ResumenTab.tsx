import React from "react";
import { User, Clock, DollarSign } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

// Extendemos localmente el tipo para evitar el error de TypeScript ts(2339)
// Nota: Se recomienda agregar 'estado_contable?: string;' directamente en @/types/taller.ts
type OrdenTrabajoConContabilidad = OrdenTrabajo & { 
    estado_contable?: string; 
};

interface ResumenTabProps {
    orden: OrdenTrabajoConContabilidad;
    onUpdateContable?: (id: string, status: string) => void; // Mantenida por compatibilidad con el padre
}

export function ResumenTab({ orden }: ResumenTabProps) {
    // Tomamos el estado directamente de la orden extendida
    const estadoContable = orden.estado_contable || 'pendiente';

    const getContableColor = (estado: string) => {
        switch(estado) {
            case 'pendiente': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'facturado': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'pagado': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'anulado': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getContableName = (estado: string) => {
        switch(estado) {
            case 'pendiente': return 'Pendiente de Pago';
            case 'facturado': return 'Facturado';
            case 'pagado': return 'Pagado';
            case 'anulado': return 'Anulado';
            default: return estado;
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

            {/* Tarjeta Estado Contable (NUEVO - SOLO VISUAL) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                    <DollarSign className="h-4 w-4 text-slate-400" /> Estado Financiero
                </h3>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Estado Actual</p>
                        
                        <div className="flex items-center gap-3">
                            {/* Convertido a un div estático que funciona como una etiqueta visual */}
                            <div 
                                className={`w-full p-3 rounded-xl border text-sm font-bold flex items-center justify-center transition-colors ${getContableColor(estadoContable)}`}
                            >
                                {getContableName(estadoContable)}
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500">
                            {estadoContable === 'pendiente' && "El cliente aún no ha realizado el pago por esta orden."}
                            {estadoContable === 'facturado' && "Facturado desde contabilidad."}
                            {estadoContable === 'pagado' && "El dinero ha sido recaudado exitosamente."}
                            {estadoContable === 'anulado' && "Esta orden o factura ha sido cancelada financieramente."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}