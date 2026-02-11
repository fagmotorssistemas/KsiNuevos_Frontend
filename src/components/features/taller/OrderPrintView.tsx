import { OrdenTrabajo } from "@/types/taller"; 
import { Wrench } from "lucide-react";

interface OrderPrintViewProps {
    orden: OrdenTrabajo;
}

export function OrderPrintView({ orden }: OrderPrintViewProps) {
    return (
        <div className="hidden print:block p-8 bg-white text-black print-container">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                <div className="flex items-center gap-3">
                    <Wrench className="h-10 w-10 text-slate-900" />
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Auto Nova</h1>
                        <p className="text-sm font-medium text-slate-600">Centro de Latonería y Pintura</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold">ORDEN DE INGRESO</h2>
                    <p className="text-2xl font-mono font-bold text-slate-800">#{orden.numero_orden.toString().padStart(6, '0')}</p>
                    <p className="text-sm text-slate-500 mt-1">Fecha: {new Date(orden.fecha_ingreso).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Datos Cliente y Vehículo */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="border rounded-lg p-4">
                    <h3 className="font-bold uppercase text-xs text-slate-500 mb-2">Cliente</h3>
                    <p className="font-bold text-lg">{orden.cliente?.nombre_completo}</p>
                    <p className="text-sm">{orden.cliente?.telefono}</p>
                </div>
                <div className="border rounded-lg p-4">
                    <h3 className="font-bold uppercase text-xs text-slate-500 mb-2">Vehículo</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="font-semibold">Placa:</span> {orden.vehiculo_placa}</p>
                        <p><span className="font-semibold">Marca:</span> {orden.vehiculo_marca}</p>
                        <p><span className="font-semibold">Modelo:</span> {orden.vehiculo_modelo}</p>
                        <p><span className="font-semibold">Color:</span> {orden.vehiculo_color}</p>
                    </div>
                </div>
            </div>

            {/* Checklist Resumen */}
            <div className="mb-8">
                <h3 className="font-bold border-b border-slate-300 mb-4 pb-1 uppercase text-sm">Estado de Recepción</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                    {Object.entries(orden.checklist_ingreso || {}).map(([key, value]) => (
                        value && (
                            <div key={key} className="flex items-center gap-2">
                                <span className="w-4 h-4 border border-slate-900 flex items-center justify-center font-bold">✓</span>
                                <span className="uppercase">{key.replace(/_/g, ' ')}</span>
                            </div>
                        )
                    ))}
                </div>
            </div>

            {/* Inventario */}
            <div className="mb-8">
                <h3 className="font-bold border-b border-slate-300 mb-4 pb-1 uppercase text-sm">Inventario / Pertenencias</h3>
                <p className="text-sm text-slate-600 italic">
                    {Object.entries(orden.checklist_ingreso || {})
                        .filter(([_, v]) => v)
                        .length === 0 ? "No se dejaron pertenencias registradas." : ""}
                </p>
            </div>

            {/* Observaciones */}
            <div className="mb-12">
                <h3 className="font-bold border-b border-slate-300 mb-4 pb-1 uppercase text-sm">Observaciones</h3>
                <p className="text-sm p-4 bg-slate-100 rounded-lg min-h-[80px]">
                    {orden.observaciones_ingreso || "Sin observaciones adicionales."}
                </p>
            </div>

            {/* Firmas */}
            <div className="grid grid-cols-2 gap-20 mt-20">
                <div className="text-center border-t border-slate-400 pt-2">
                    <p className="font-bold text-sm">Firma del Cliente</p>
                    <p className="text-xs text-slate-500">Acepto condiciones del servicio</p>
                </div>
                <div className="text-center border-t border-slate-400 pt-2">
                    <p className="font-bold text-sm">Recibido Por</p>
                    <p className="text-xs text-slate-500">Auto Nova</p>
                </div>
            </div>
            
            {/* Footer Legal */}
            <div className="mt-12 text-[10px] text-slate-400 text-center">
                <p>Auto Nova - Especialistas en Latonería y Pintura. El taller no se hace responsable por objetos de valor no declarados en esta orden.</p>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>
        </div>
    );
}