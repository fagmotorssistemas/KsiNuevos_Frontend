"use client";

import { useState, useEffect } from "react";
import { X, Wrench, Package, Clock, User, Loader2, Plus, Trash2, DollarSign, Printer, CalendarClock } from "lucide-react";
import { useOrdenes } from "@/hooks/taller/useOrdenes";
import { OrdenTrabajo, ConsumoMaterial, DetalleOrden, ServicioCatalogo } from "@/types/taller";
import { useInventario } from "@/hooks/taller/useInventario";

interface WorkOrderModalProps {
    orden: OrdenTrabajo | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    onPrint: () => void;
}

export function WorkOrderModal({ orden, isOpen, onClose, onStatusChange, onPrint }: WorkOrderModalProps) {
    const { items: inventario } = useInventario();
    const {
        registrarConsumo, fetchConsumosOrden,
        fetchDetallesOrden, agregarDetalle, eliminarDetalle,
        fetchServiciosCatalogo, fetchMecanicos,
        actualizarEstadoContable
    } = useOrdenes();

    const [activeTab, setActiveTab] = useState<'info' | 'presupuesto' | 'materiales'>('info');

    // @ts-ignore
    const [localEstadoContable, setLocalEstadoContable] = useState(orden?.estado_contable || 'pendiente');
    const [isUpdatingContable, setIsUpdatingContable] = useState(false);
    const [showEntregaConfirm, setShowEntregaConfirm] = useState(false);

    // Estados Materiales y Presupuesto
    const [consumos, setConsumos] = useState<ConsumoMaterial[]>([]);
    const [selectedItem, setSelectedItem] = useState("");
    const [cantidadMat, setCantidadMat] = useState(1);
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);

    const [detalles, setDetalles] = useState<DetalleOrden[]>([]);
    const [catalogo, setCatalogo] = useState<ServicioCatalogo[]>([]);
    const [mecanicos, setMecanicos] = useState<any[]>([]);

    const [descServicio, setDescServicio] = useState("");
    const [precioServicio, setPrecioServicio] = useState("");
    const [mecanicoId, setMecanicoId] = useState("");
    const [isAddingService, setIsAddingService] = useState(false);

    useEffect(() => {
        if (orden && isOpen) {
            loadConsumos();
            loadPresupuesto();
            loadCatalogos();
            // @ts-ignore
            setLocalEstadoContable(orden.estado_contable || 'pendiente');
            setShowEntregaConfirm(false); // Resetear modal de confirmación al abrir
        }
    }, [orden, isOpen]);

    const loadCatalogos = async () => {
        const servs = await fetchServiciosCatalogo();
        setCatalogo(servs);
        const mecs = await fetchMecanicos();
        setMecanicos(mecs);
    }

    const loadConsumos = async () => {
        if (!orden) return;
        const data = await fetchConsumosOrden(orden.id);
        // @ts-ignore
        setConsumos(data);
    };

    const loadPresupuesto = async () => {
        if (!orden) return;
        const data = await fetchDetallesOrden(orden.id);
        setDetalles(data);
    };

    const handleEstadoContableChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!orden) return;
        const nuevoEstado = e.target.value;
        setIsUpdatingContable(true);
        setLocalEstadoContable(nuevoEstado);
        await actualizarEstadoContable(orden.id, nuevoEstado);
        setIsUpdatingContable(false);
    };

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orden || !selectedItem) return;
        setIsAddingMaterial(true);
        const result = await registrarConsumo(orden.id, selectedItem, cantidadMat);
        if (result.success) {
            await loadConsumos();
            setSelectedItem("");
            setCantidadMat(1);
        }
        setIsAddingMaterial(false);
    };

    const handleSelectServicio = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const servId = e.target.value;
        if (!servId) return;
        const servicio = catalogo.find(s => s.id === servId);
        if (servicio) {
            setDescServicio(servicio.nombre_servicio);
            setPrecioServicio(servicio.precio_sugerido.toString());
        }
    };

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orden || !descServicio || !precioServicio) return;
        setIsAddingService(true);
        const result = await agregarDetalle({
            orden_id: orden.id,
            descripcion: descServicio,
            precio_unitario: parseFloat(precioServicio),
            cantidad: 1,
            mecanico_asignado_id: mecanicoId || undefined
        });

        if (result.success) {
            await loadPresupuesto();
            setDescServicio("");
            setPrecioServicio("");
            setMecanicoId("");
        }
        setIsAddingService(false);
    };

    const handleDeleteService = async (id: string) => {
        if (confirm("¿Eliminar este item del presupuesto?")) {
            await eliminarDetalle(id);
            loadPresupuesto();
        }
    };

    const handleEntregarVehiculo = () => {
        if (!orden) return;
        onStatusChange(orden.id, 'entregado');
        setShowEntregaConfirm(false);
        onClose();
    };

    const totalPresupuesto = detalles.reduce((acc, curr) => acc + (curr.precio_unitario * curr.cantidad), 0);

    const getContableColor = (estado: string) => {
        switch (estado) {
            case 'pendiente': return 'text-amber-600';
            case 'facturado': return 'text-blue-600';
            case 'pagado': return 'text-emerald-600';
            case 'anulado': return 'text-red-600';
            default: return 'text-slate-600';
        }
    };

    if (!isOpen || !orden) return null;

    // Verificar si está retrasado para pintarlo en rojo
    const isRetrasado = orden.fecha_promesa_entrega && new Date(orden.fecha_promesa_entrega).getTime() < new Date().getTime();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">

                {showEntregaConfirm && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full text-center animate-in zoom-in-95">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">¿Entregar Vehículo?</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Al marcar esta orden como <span className="font-bold text-slate-700">"Entregado"</span>, el vehículo se considerará fuera del taller <br /><br />
                                La orden desaparecerá de la vista de trabajos activos y se archivará. A partir de ahora, solo podrás encontrarla en el módulo de <strong>Expedientes</strong>.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowEntregaConfirm(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEntregarVehiculo}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    Sí, Entregar Vehículo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">ORDEN #{orden.numero_orden}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{orden.estado.replace('_', ' ')}</span>
                        </div>
                        <h2 className="font-bold text-xl text-slate-900">{orden.vehiculo_marca} {orden.vehiculo_modelo} <span className="text-slate-400 font-normal">({orden.vehiculo_placa})</span></h2>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap justify-end">
                        {/* <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline-block">Pago:</span>
                            {isUpdatingContable && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                            <select
                                value={localEstadoContable}
                                onChange={handleEstadoContableChange}
                                disabled={isUpdatingContable}
                                className={`text-sm font-bold outline-none bg-transparent cursor-pointer disabled:opacity-50 ${getContableColor(localEstadoContable)}`}
                            >
                                <option value="pendiente" className="text-amber-600 font-bold">Pendiente</option>
                                <option value="facturado" className="text-blue-600 font-bold">Facturado</option>
                                <option value="pagado" className="text-emerald-600 font-bold">Pagado</option>
                                <option value="anulado" className="text-red-600 font-bold">Anulado</option>
                            </select>
                        </div> */}

                        {orden.estado !== 'entregado' && (
                            <button
                                onClick={() => setShowEntregaConfirm(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                <Package className="h-4 w-4" />
                                <span className="hidden sm:inline-block">Entregar Vehículo</span>
                                <span className="sm:hidden">Entregar</span>
                            </button>
                        )}

                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-slate-200 px-6 gap-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Wrench className="h-4 w-4" /> Info
                    </button>
                    <button
                        onClick={() => setActiveTab('presupuesto')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'presupuesto' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <DollarSign className="h-4 w-4" /> Presupuesto
                    </button>
                    <button
                        onClick={() => setActiveTab('materiales')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'materiales' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Package className="h-4 w-4" /> Materiales
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">

                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <User className="h-3 w-3" /> Cliente
                                    </h3>
                                    <p className="font-bold text-slate-800 text-lg">{orden.cliente?.nombre_completo}</p>
                                    <p className="text-slate-500">{orden.cliente?.telefono}</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Clock className="h-3 w-3" /> Tiempos
                                    </h3>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-500 text-sm">Fecha Ingreso:</span>
                                        <span className="font-medium text-slate-800">{new Date(orden.fecha_ingreso).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                        <span className="text-slate-500 text-sm">Días en Taller:</span>
                                        <span className="font-bold text-blue-600">
                                            {Math.floor((new Date().getTime() - new Date(orden.fecha_ingreso).getTime()) / (1000 * 3600 * 24))} días
                                        </span>
                                    </div>
                                    {/* NUEVA SECCIÓN: PROMESA DE ENTREGA */}
                                    <div className="flex justify-between items-center mt-3">
                                        <span className="text-slate-500 text-sm flex items-center gap-1">
                                            <CalendarClock className="h-3.5 w-3.5" /> Promesa Entrega:
                                        </span>
                                        {orden.fecha_promesa_entrega ? (
                                            <span className={`font-bold text-sm px-2 py-0.5 rounded ${isRetrasado ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-700'}`}>
                                                {new Date(orden.fecha_promesa_entrega).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-sm italic">No definida</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Observaciones de Ingreso</h3>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {orden.observaciones_ingreso || "Ninguna observación registrada."}
                                </p>
                            </div>

                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                <h3 className="text-sm font-bold text-blue-800 mb-3">Mover Etapa (Taller)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['recepcion', 'en_proceso', 'terminado'].map((estado) => (
                                        <button
                                            key={estado}
                                            onClick={() => {
                                                onStatusChange(orden.id, estado);
                                                onClose();
                                            }}
                                            disabled={orden.estado === estado}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${orden.estado === estado
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-100'
                                                }`}
                                        >
                                            {estado.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={onPrint}
                                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold underline decoration-slate-300 underline-offset-4 transition-colors"
                                >
                                    <Printer className="h-4 w-4" />
                                    Imprimir Orden / PDF
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'presupuesto' && (
                        <div className="space-y-6">
                            <form onSubmit={handleAddService} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Servicio / Trabajo</label>
                                        <div className="flex gap-2 flex-col sm:flex-row">
                                            <select
                                                className="w-full sm:w-1/3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                                onChange={handleSelectServicio}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Cargar del Catálogo...</option>
                                                {catalogo.map(s => (
                                                    <option key={s.id} value={s.id}>{s.nombre_servicio} (${s.precio_sugerido})</option>
                                                ))}
                                            </select>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Descripción del trabajo..."
                                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={descServicio}
                                                onChange={e => setDescServicio(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Costo ($)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                            value={precioServicio}
                                            onChange={e => setPrecioServicio(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mecánico (Opcional)</label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={mecanicoId}
                                            onChange={e => setMecanicoId(e.target.value)}
                                        >
                                            <option value="">Sin asignar</option>
                                            {mecanicos.map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isAddingService}
                                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
                                    >
                                        {isAddingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Agregar Item
                                    </button>
                                </div>
                            </form>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[600px]">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Descripción</th>
                                            <th className="px-4 py-3">Mecánico</th>
                                            <th className="px-4 py-3 text-right">Precio</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {detalles.map((det) => (
                                            <tr key={det.id}>
                                                <td className="px-4 py-3 font-medium text-slate-800">{det.descripcion}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">{det.mecanico?.full_name || '-'}</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold">${det.precio_unitario.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handleDeleteService(det.id)} className="text-slate-400 hover:text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {detalles.length > 0 && (
                                            <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                                                <td colSpan={2} className="px-4 py-3 text-right">TOTAL ESTIMADO:</td>
                                                <td className="px-4 py-3 text-right text-lg">${totalPresupuesto.toFixed(2)}</td>
                                                <td></td>
                                            </tr>
                                        )}
                                        {detalles.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                    No hay items en el presupuesto.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'materiales' && (
                        <div className="space-y-6">
                            <form onSubmit={handleAddMaterial} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Producto / Material</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={selectedItem}
                                        onChange={(e) => setSelectedItem(e.target.value)}
                                    >
                                        <option value="">Seleccionar material...</option>
                                        {inventario.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.nombre} (Stock: {item.stock_actual})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-full md:w-24">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cant.</label>
                                    <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={cantidadMat}
                                        onChange={(e) => setCantidadMat(parseFloat(e.target.value))}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isAddingMaterial}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 h-10 w-full md:w-auto"
                                >
                                    {isAddingMaterial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Registrar
                                </button>
                            </form>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[500px]">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Material</th>
                                            <th className="px-4 py-3">Cantidad</th>
                                            <th className="px-4 py-3">Registrado Por</th>
                                            <th className="px-4 py-3">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {consumos.length > 0 ? (
                                            consumos.map((consumo) => (
                                                <tr key={consumo.id}>
                                                    <td className="px-4 py-3 font-medium text-slate-800">{consumo.item?.nombre}</td>
                                                    <td className="px-4 py-3">{consumo.cantidad} {consumo.item?.unidad_medida}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">{consumo.registrado_por?.full_name}</td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                                        {new Date(consumo.fecha_consumo).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                    No se han registrado consumos aún.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}