import React, { useState, useEffect } from "react";
import { User, Clock, DollarSign, FileText, Wrench, Loader2, Pencil, Save, X, Trash2 } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";
import { useOrdenes } from "@/hooks/taller/useOrdenes";

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
}

export function ResumenTab({
    orden,
    onAssignPresupuesto,
    refreshDeps = 0,
    onSaveObservaciones,
    onSaveCliente,
    onDeleteOrden,
}: ResumenTabProps) {
    const { fetchDetallesOrden } = useOrdenes();
    const [detallesPresupuesto, setDetallesPresupuesto] = useState<{ id: string; descripcion: string; precio_unitario: number; cantidad: number }[]>([]);
    const [loadingPresupuesto, setLoadingPresupuesto] = useState(true);

    const [editingObs, setEditingObs] = useState(false);
    const [obsDraft, setObsDraft] = useState(orden.observaciones_ingreso || "");
    const [savingObs, setSavingObs] = useState(false);

    const [editingCliente, setEditingCliente] = useState(false);
    const [clienteDraft, setClienteDraft] = useState({
        nombre_completo: orden.cliente?.nombre_completo || "",
        telefono: orden.cliente?.telefono || "",
        email: orden.cliente?.email || "",
    });
    const [savingCliente, setSavingCliente] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!orden?.id) return;
        setLoadingPresupuesto(true);
        fetchDetallesOrden(orden.id).then((data) => {
            setDetallesPresupuesto(data);
            setLoadingPresupuesto(false);
        });
    }, [orden?.id, refreshDeps]);

    useEffect(() => {
        if (!editingObs) setObsDraft(orden.observaciones_ingreso || "");
    }, [orden.observaciones_ingreso, editingObs]);

    useEffect(() => {
        if (!editingCliente) {
            setClienteDraft({
                nombre_completo: orden.cliente?.nombre_completo || "",
                telefono: orden.cliente?.telefono || "",
                email: orden.cliente?.email || "",
            });
        }
    }, [orden.cliente, editingCliente]);

    const totalPresupuesto = detallesPresupuesto.reduce((acc, d) => acc + d.precio_unitario * d.cantidad, 0);
    const tienePresupuesto = detallesPresupuesto.length > 0;
    const estadoContable = orden.estado_contable || 'pendiente';

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

    const handleSaveObs = async () => {
        if (!onSaveObservaciones) return;
        setSavingObs(true);
        const result = await onSaveObservaciones(obsDraft);
        setSavingObs(false);
        if (result.success) setEditingObs(false);
    };

    const handleSaveCliente = async () => {
        if (!onSaveCliente) return;
        setSavingCliente(true);
        const result = await onSaveCliente(clienteDraft);
        setSavingCliente(false);
        if (result.success) setEditingCliente(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            {/* Observaciones */}
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" /> Lo que el cliente solicitó
                    </h3>
                    {onSaveObservaciones && !editingObs && (
                        <button
                            type="button"
                            onClick={() => setEditingObs(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                    )}
                </div>

                {editingObs ? (
                    <div className="space-y-3">
                        <textarea
                            value={obsDraft}
                            onChange={(e) => setObsDraft(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-sm resize-y"
                            placeholder="Ej: Lavar, lubricar, revisar frenos..."
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={savingObs}
                                onClick={() => {
                                    setObsDraft(orden.observaciones_ingreso || "");
                                    setEditingObs(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" /> Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={savingObs}
                                onClick={handleSaveObs}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {savingObs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[60px] whitespace-pre-wrap">
                        {orden.observaciones_ingreso?.trim() || "No se registraron observaciones ni solicitudes del cliente al ingreso."}
                    </p>
                )}
            </div>

            {/* Cliente */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" /> Datos del Cliente
                    </h3>
                    {onSaveCliente && orden.cliente_id && !editingCliente && (
                        <button
                            type="button"
                            onClick={() => setEditingCliente(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                    )}
                </div>

                {editingCliente ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nombre completo</label>
                            <input
                                type="text"
                                required
                                value={clienteDraft.nombre_completo}
                                onChange={(e) => setClienteDraft((d) => ({ ...d, nombre_completo: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={clienteDraft.telefono}
                                    onChange={(e) => setClienteDraft((d) => ({ ...d, telefono: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={clienteDraft.email}
                                    onChange={(e) => setClienteDraft((d) => ({ ...d, email: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                disabled={savingCliente}
                                onClick={() => setEditingCliente(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" /> Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={savingCliente}
                                onClick={handleSaveCliente}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {savingCliente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                ) : (
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
                )}
            </div>

            {/* Tiempos */}
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
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Registrado por:</span>
                        <span className="font-bold text-slate-800 text-right">
                            {orden.creado_por?.full_name || "No registrado"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Presupuesto */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                    <Wrench className="h-4 w-4 text-slate-400" /> Presupuesto estimado
                </h3>
                {loadingPresupuesto ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">Cargando presupuesto...</span>
                    </div>
                ) : tienePresupuesto ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total estimado</p>
                            <p className="text-2xl font-black text-emerald-700">${totalPresupuesto.toFixed(2)}</p>
                        </div>
                        <ul className="space-y-2 text-sm">
                            {detallesPresupuesto.slice(0, 5).map((d) => (
                                <li key={d.id} className="flex justify-between text-slate-700">
                                    <span className="truncate pr-2">{d.descripcion}</span>
                                    <span className="font-mono font-medium shrink-0">${(d.precio_unitario * d.cantidad).toFixed(2)}</span>
                                </li>
                            ))}
                            {detallesPresupuesto.length > 5 && (
                                <li className="text-slate-500 text-xs">+ {detallesPresupuesto.length - 5} ítem(s) más</li>
                            )}
                        </ul>
                        {onAssignPresupuesto && (
                            <button
                                type="button"
                                onClick={onAssignPresupuesto}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700 font-bold text-sm transition-colors"
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
                                <Wrench className="h-4 w-4" /> Asignar presupuesto
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Estado contable */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                    <DollarSign className="h-4 w-4 text-slate-400" /> Estado Financiero
                </h3>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Estado Actual</p>
                        <div className="flex items-center gap-3">
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

            {/* Eliminar expediente */}
            {onDeleteOrden && (
                <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
