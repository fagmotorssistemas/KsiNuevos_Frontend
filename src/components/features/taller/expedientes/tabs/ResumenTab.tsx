import React from "react";
import { User, Clock } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

export function ResumenTab({ orden }: { orden: OrdenTrabajo }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
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
        </div>
    );
}