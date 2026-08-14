import React, { useState, useEffect } from "react";
import { User, Clock, DollarSign, Tag, Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";
import { useOrdenes } from "@/hooks/taller/useOrdenes";
import { useFinanzas } from "@/hooks/taller/useFinanzas";
import { TransactionModal } from "@/components/features/taller/finanzas/TransactionModal";

type OrdenTrabajoConContabilidad = OrdenTrabajo & {
    estado_contable?: string;
};

interface ResumenTabProps {
    orden: OrdenTrabajoConContabilidad;
    onUpdateContable?: (id: string, status: string) => void;
    onAssignPresupuesto?: () => void;
    refreshDeps?: number;
    onSaveObservaciones?: (texto: string) => Promise<{ success: boolean; error?: string }>;
    onSaveCliente?: (datos: {
        nombre_completo: string;
        telefono?: string;
        email?: string;
    }) => Promise<{ success: boolean; error?: string }>;
    onDeleteOrden?: () => Promise<{ success: boolean; error?: string }>;
    onRefreshOrder?: () => void;
}

export function ResumenTab({
    orden,
    onAssignPresupuesto,
    refreshDeps = 0,
    onDeleteOrden,
    onRefreshOrder,
}: ResumenTabProps) {
    const { fetchDetallesOrden } = useOrdenes();
    const { cuentas, registrarTransaccion } = useFinanzas();
    const [detallesPresupuesto, setDetallesPresupuesto] = useState<{ id: string; descripcion: string; precio_unitario: number; cantidad: number }[]>([]);
    const [loadingPresupuesto, setLoadingPresupuesto] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    useEffect(() => {
        if (!orden?.id) return;
        setLoadingPresupuesto(true);
        fetchDetallesOrden(orden.id).then((data) => {
            setDetallesPresupuesto(data);
            setLoadingPresupuesto(false);
        });
    }, [orden?.id, refreshDeps]);

    const totalPresupuesto = detallesPresupuesto.reduce((acc, d) => acc + d.precio_unitario * d.cantidad, 0);
    const tienePresupuesto = detallesPresupuesto.length > 0;
    const estadoContable = orden.estado_contable || 'pendiente';

    const solicitudes = (orden.observaciones_ingreso?.trim() || "")
        .split(/\n+/)
        .map((linea) => linea.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);

    const getContableColor = (estado: string) => {
        switch (estado) {
            case 'pendiente': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'facturado': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'pagado': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'anulado': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getContableName = (estado: string) => {
        switch (estado) {
            case 'pendiente': return 'Pendiente de Pago';
            case 'facturado': return 'Facturado';
            case 'pagado': return 'Pagado';
            case 'anulado': return 'Anulado';
            default: return estado;
        }
    };

    const handleDelete = async () => {
        if (!onDeleteOrden) return;
        const ok = confirm(
            `¿Eliminar el expediente #${orden.numero_orden}?\n\nSe borrarán también presupuesto, consumos y transacciones vinculados. Esta acción no se puede deshacer.`
        );
        if (!ok) return;
        setDeleting(true);
        await onDeleteOrden();
        setDeleting(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" /> Datos del Cliente
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</p>
                            <p className="font-medium text-slate-800">{orden.cliente?.nombre_completo || 'N/A'}</p>
                        </div>
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

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" /> Línea de Tiempo
                    </h3>
                    <div className="divide-y divide-slate-100">
                        <div className="flex justify-between items-center py-3">
                            <span className="text-sm font-medium text-slate-500">Ingreso:</span>
                            <span className="font-bold text-slate-800">{new Date(orden.fecha_ingreso).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <span className="text-sm font-medium text-slate-500">Salida:</span>
                            {orden.fecha_salida_real ? (
                                <span className="font-bold text-emerald-600">{new Date(orden.fecha_salida_real).toLocaleDateString()}</span>
                            ) : (
                                <span className="font-bold text-amber-500">En taller</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <span className="text-sm font-medium text-slate-500">Registrado por:</span>
                            <span className="font-bold text-slate-800 text-right">
                                {orden.creado_por?.full_name || "No registrado"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <h3 className="text-sm font-bold text-slate-800 px-6 pt-6 pb-4">
                    Resumen del Trabajo y Presupuesto
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x divide-y lg:divide-y-0 divide-slate-100">
                    <div className="p-6 pt-2">
                        <p className="text-sm font-bold text-slate-800 mb-3">Lo que el cliente solicitó</p>
                        {solicitudes.length > 0 ? (
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                                <ul className="space-y-2.5">
                                    {solicitudes.map((item, idx) => (
                                        <li key={idx} className="flex gap-2 text-sm text-slate-700 leading-snug">
                                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                                <p className="text-sm text-slate-500">
                                    No se registraron observaciones ni solicitudes del cliente al ingreso.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 pt-2">
                        <p className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Tag className="h-4 w-4 text-slate-400" /> Presupuesto estimado
                        </p>
                        {loadingPresupuesto ? (
                            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">Cargando presupuesto...</span>
                            </div>
                        ) : tienePresupuesto ? (
                            <div>
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total estimado</p>
                                    <p className="text-2xl font-black text-emerald-700">${totalPresupuesto.toFixed(2)}</p>
                                </div>
                                <div className="space-y-2">
                                    {detallesPresupuesto.slice(0, 5).map((d) => (
                                        <div key={d.id} className="flex justify-between gap-3 text-sm text-slate-700">
                                            <span className="truncate">{d.descripcion}</span>
                                            <span className="font-mono font-medium shrink-0">${(d.precio_unitario * d.cantidad).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {detallesPresupuesto.length > 5 && (
                                        <p className="text-slate-500 text-xs">+ {detallesPresupuesto.length - 5} ítem(s) más</p>
                                    )}
                                </div>
                                {onAssignPresupuesto && (
                                    <button
                                        type="button"
                                        onClick={onAssignPresupuesto}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700 font-bold text-sm transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" /> Editar presupuesto
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-slate-500 text-sm">
                                    Este trabajo no tiene presupuesto asignado. Puedes agregar servicios y trabajos para generar un presupuesto estimado.
                                </p>
                                {onAssignPresupuesto && (
                                    <button
                                        type="button"
                                        onClick={onAssignPresupuesto}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700 font-bold text-sm transition-colors"
                                    >
                                        <Tag className="h-4 w-4" /> Asignar presupuesto
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 pt-2">
                        <p className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-slate-400" /> Estado Financiero
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Estado Actual</p>
                        <div
                            className={`w-full p-3 rounded-xl border text-sm font-bold flex items-center justify-center ${getContableColor(estadoContable)}`}
                        >
                            {getContableName(estadoContable)}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsTransactionModalOpen(true)}
                            className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Registrar Movimiento
                        </button>
                    </div>
                </div>
            </div>

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                cuentas={cuentas}
                onSave={async (data, file) => {
                    const result = await registrarTransaccion(data, file);
                    if (result.success) onRefreshOrder?.();
                    return result;
                }}
                defaultOrdenId={orden.id}
                defaultTipo="ingreso"
                lockOrden
            />

            {onDeleteOrden && (
                <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-slate-800">Eliminar expediente</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Borra la orden #{orden.numero_orden} y sus datos vinculados (presupuesto, consumos, pagos).
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={handleDelete}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60 shrink-0"
                    >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Eliminar
                    </button>
                </div>
            )}
        </div>
    );
}
