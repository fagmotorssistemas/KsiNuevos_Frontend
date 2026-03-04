"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FormIngresoGPS } from "./FormIngresoGPS";
import { rastreadoresService } from "@/services/rastreadores.service";
import { InventarioGPS, type EstadoConeccionGPS, type ModeloGPS } from "@/types/rastreadores.types";

function BadgeEstado({ estado }: { estado?: EstadoConeccionGPS | null }) {
    const v = estado ?? "offline";
    const classes = {
        online: "bg-emerald-100 text-emerald-800 border-emerald-200",
        inactivo: "bg-amber-100 text-amber-800 border-amber-200",
        offline: "bg-red-100 text-red-800 border-red-200"
    };
    const labels = { online: "Online", inactivo: "Inactivo", offline: "Offline" };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${classes[v as keyof typeof classes] ?? classes.offline}`}>
            {labels[v as keyof typeof labels] ?? v}
        </span>
    );
}

function BadgeDisposicion({ estado }: { estado?: string | null }) {
    const v = (estado ?? "STOCK") as string;
    const isVendido = v === "VENDIDO";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${isVendido ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {isVendido ? "Vendido" : "Stock"}
        </span>
    );
}
import { useInventarioSIM } from "@/hooks/useInventarioSim";
import { RefreshCw, Box, CreditCard, Pencil, X, Plus } from "lucide-react";
import { toast } from "sonner";

export function InventarioTabs() {
    const [activeTab, setActiveTab] = useState<'GPS' | 'SIMS'>('GPS');
    const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);

    const [inventarioGPS, setInventarioGPS] = useState<InventarioGPS[]>([]);
    const [modelos, setModelos] = useState<ModeloGPS[]>([]);
    const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);

    const [filtroModeloId, setFiltroModeloId] = useState<string>("");
    const [filtroEstado, setFiltroEstado] = useState<EstadoConeccionGPS | "TODOS">("TODOS");
    const [filtroStockVendido, setFiltroStockVendido] = useState<'TODOS' | 'STOCK' | 'VENDIDOS'>('TODOS');

    const loadInventarioGPS = useCallback(async () => {
        const data = await rastreadoresService.getInventarioCompleto();
        setInventarioGPS(data);
    }, []);

    useEffect(() => { loadInventarioGPS(); }, [loadInventarioGPS]);

    useEffect(() => {
        if (activeTab === 'GPS') {
            Promise.all([rastreadoresService.getModelos(), rastreadoresService.getProveedores()])
                .then(([m, p]) => {
                    setModelos(m);
                    setProveedores(p);
                });
        }
    }, [activeTab]);

    const [editingItem, setEditingItem] = useState<InventarioGPS | null>(null);
    const [editForm, setEditForm] = useState({ modelo_id: "", proveedor_id: "", costo_compra: 0, estado_coneccion: "offline" as EstadoConeccionGPS, sim_iccid: "", sim_imsi: "" });
    const [savingEdit, setSavingEdit] = useState(false);

    const modelosFiltradosEdicion = useMemo(() => {
        const proveedorId = editForm.proveedor_id;
        if (!proveedorId) return [] as ModeloGPS[];
        return modelos.filter(m => (m as any)?.provedor_id === proveedorId);
    }, [editForm.proveedor_id, modelos]);

    useEffect(() => {
        if (editingItem) {
            const precio = editingItem.costo_compra ?? editingItem.modelo?.costo_referencia ?? 0;
            setEditForm(prev => ({
                ...prev,
                modelo_id: editingItem.modelo?.id ?? "",
                proveedor_id: editingItem.proveedor?.id ?? "",
                costo_compra: precio,
                estado_coneccion: (editingItem.estado_coneccion ?? "offline") as EstadoConeccionGPS,
                sim_iccid: "",
                sim_imsi: ""
            }));
            rastreadoresService.getSimByGpsId(editingItem.id).then(sim => {
                if (sim) setEditForm(prev => ({ ...prev, sim_iccid: sim.iccid, sim_imsi: sim.imsi ?? "" }));
            });
        }
    }, [editingItem]);

    const handleGuardarEdicion = async () => {
        if (!editingItem) return;
        if (!editForm.modelo_id || !editForm.proveedor_id) {
            toast.error("Seleccione modelo y proveedor");
            return;
        }
        setSavingEdit(true);
        try {
            const res = await rastreadoresService.actualizarItemInventarioGPS(editingItem.id, {
                modelo_id: editForm.modelo_id,
                proveedor_id: editForm.proveedor_id,
                costo_compra: editForm.costo_compra,
                estado_coneccion: editForm.estado_coneccion
            });
            if (!res.success) {
                toast.error(res.error || "Error al guardar");
                return;
            }
            const simRes = await rastreadoresService.linkOrUpdateSimForGps(
                editingItem.id,
                editForm.sim_iccid.trim() || null,
                editForm.sim_imsi.trim() || null
            );
            if (!simRes.success) toast.error(simRes.error || "Error al vincular SIM");
            else toast.success("Registro actualizado");
            setEditingItem(null);
            loadInventarioGPS();
        } catch (e: any) {
            toast.error(e?.message || "Error al guardar");
        } finally {
            setSavingEdit(false);
        }
    };

    const inventarioFiltradoPorStockVendido = useMemo(() => {
        if (filtroStockVendido === 'TODOS') return inventarioGPS;
        if (filtroStockVendido === 'STOCK') return inventarioGPS.filter(item => item.estado === 'STOCK');
        return inventarioGPS.filter(item => item.estado === 'VENDIDO');
    }, [inventarioGPS, filtroStockVendido]);

    const totalEnStock = useMemo(() => inventarioGPS.filter(i => i.estado === 'STOCK').length, [inventarioGPS]);
    const totalVendidos = useMemo(() => inventarioGPS.filter(i => i.estado === 'VENDIDO').length, [inventarioGPS]);
    const totalStockGPS = inventarioGPS.length;
    const valorInventarioGPS = useMemo(
        () => inventarioGPS.filter(i => i.estado === 'STOCK').reduce(
            (acc, curr) => acc + (curr.modelo?.costo_referencia ?? curr.costo_compra ?? 0),
            0
        ),
        [inventarioGPS]
    );

    const modelosEnStock = useMemo(() => {
        const map = new Map<string, { modelo: ModeloGPS; count: number }>();
        for (const item of inventarioFiltradoPorStockVendido) {
            if (!item.modelo?.id) continue;
            const existing = map.get(item.modelo.id);
            if (existing) {
                existing.count += 1;
            } else {
                map.set(item.modelo.id, { modelo: item.modelo, count: 1 });
            }
        }
        return Array.from(map.values());
    }, [inventarioFiltradoPorStockVendido]);

    const inventarioFiltradoPorModelo = useMemo(() => {
        if (!filtroModeloId) return inventarioFiltradoPorStockVendido;
        return inventarioFiltradoPorStockVendido.filter(item => item.modelo?.id === filtroModeloId);
    }, [inventarioFiltradoPorStockVendido, filtroModeloId]);

    const resumenEstados = useMemo(() => {
        let total = 0;
        let online = 0;
        let inactivo = 0;
        let offline = 0;
        for (const item of inventarioFiltradoPorModelo) {
            total += 1;
            const est = (item.estado_coneccion ?? "offline") as EstadoConeccionGPS;
            if (est === "online") online += 1;
            else if (est === "inactivo") inactivo += 1;
            else offline += 1;
        }
        return { total, online, inactivo, offline };
    }, [inventarioFiltradoPorModelo]);

    const inventarioGPSFiltrado = useMemo(() => {
        return inventarioFiltradoPorModelo.filter(item => {
            const estadoItem = (item.estado_coneccion ?? "offline") as EstadoConeccionGPS;
            const matchEstado = filtroEstado === "TODOS" || estadoItem === filtroEstado;
            return matchEstado;
        });
    }, [inventarioFiltradoPorModelo, filtroEstado]);

    // ==========================================
    // 3. LÓGICA DE SIMS (Usando tu nuevo hook)
    // ==========================================
    const { 
        sims, 
        loadSims, 
        totalStock: totalStockSIM, 
        costoTotalMensual 
    } = useInventarioSIM();

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="space-y-6">
            
            {/* Pestañas + botón Crear en esquina */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setActiveTab('GPS')}
                        className={`px-5 py-2.5 text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-2 ${activeTab === 'GPS' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        <Box size={16} /> Inventario GPS
                    </button>
                    <button 
                        onClick={() => setActiveTab('SIMS')}
                        className={`px-5 py-2.5 text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-2 ${activeTab === 'SIMS' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        <CreditCard size={16} /> Inventario SIMs
                    </button>
                </div>
                {activeTab === 'GPS' && (
                    <button
                        type="button"
                        onClick={() => setIsCrearModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
                    >
                        <Plus size={16} /> Crear
                    </button>
                )}
            </div>

            {/* Contenido: solo KPIs y listado */}
                <div className="w-full space-y-6">
                    
                    {/* KPIs Dinámicos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {activeTab === 'GPS' ? (filtroStockVendido === 'TODOS' ? 'Total unidades' : filtroStockVendido === 'STOCK' ? 'Unidades en Stock' : 'Vendidos') : 'Unidades en Stock'}
                                </p>
                                <p className="text-3xl font-black text-slate-900 mt-1">
                                    {activeTab === 'GPS' ? (filtroStockVendido === 'TODOS' ? totalStockGPS : filtroStockVendido === 'STOCK' ? totalEnStock : totalVendidos) : totalStockSIM}
                                </p>
                            </div>
                            <div className={`p-3 rounded-xl ${activeTab === 'GPS' ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>
                                {activeTab === 'GPS' ? <Box size={24}/> : <CreditCard size={24}/>}
                            </div>
                        </div>
                        
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {activeTab === 'GPS' ? 'Valor Inventario' : 'Costo Total Mensual'}
                                </p>
                                <p className="text-3xl font-black text-emerald-600 mt-1">
                                    ${activeTab === 'GPS' ? valorInventarioGPS.toLocaleString() : costoTotalMensual.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <span className="text-xl font-black">$</span>
                            </div>
                        </div>
                    </div>

                    {/* Contenedor de la Tabla */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                {activeTab === 'GPS' ? 'Inventario GPS' : 'Stock Disponible de SIMs'}
                            </h3>

                            {activeTab === 'GPS' && (
                                <div className="flex flex-wrap gap-2 items-center">
                                    <select
                                        value={filtroStockVendido}
                                        onChange={e => setFiltroStockVendido(e.target.value as 'TODOS' | 'STOCK' | 'VENDIDOS')}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-600"
                                    >
                                        <option value="TODOS">{`Todos (${totalStockGPS})`}</option>
                                        <option value="STOCK">{`Stock (${totalEnStock})`}</option>
                                        <option value="VENDIDOS">{`Vendidos (${totalVendidos})`}</option>
                                    </select>
                                    <select
                                        value={filtroModeloId}
                                        onChange={e => setFiltroModeloId(e.target.value)}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-600"
                                    >
                                        <option value="">
                                            {`Todos los modelos (${inventarioFiltradoPorStockVendido.length})`}
                                        </option>
                                        {modelosEnStock.map(({ modelo, count }) => (
                                            <option key={modelo.id} value={modelo.id}>
                                                {`${modelo.marca ?? "—"} (${count})`}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={filtroEstado}
                                        onChange={e => setFiltroEstado(e.target.value as any)}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-600"
                                    >
                                        <option value="TODOS">
                                            {`Todos (${resumenEstados.total})`}
                                        </option>
                                        <option value="online">
                                            {`Online (${resumenEstados.online})`}
                                        </option>
                                        <option value="inactivo">
                                            {`Inactivo (${resumenEstados.inactivo})`}
                                        </option>
                                        <option value="offline">
                                            {`Offline (${resumenEstados.offline})`}
                                        </option>
                                    </select>

                                    <button 
                                        onClick={loadInventarioGPS} 
                                        className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Actualizar"
                                    >
                                        <RefreshCw size={14}/>
                                    </button>
                                </div>
                            )}

                            {activeTab === 'SIMS' && (
                                <button 
                                    onClick={loadSims} 
                                    className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                                    title="Actualizar"
                                >
                                    <RefreshCw size={14}/>
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-[500px] overflow-y-auto">
                            
                            {/* TABLA DE GPS */}
                            {activeTab === 'GPS' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-5 py-3">Disposición</th>
                                            <th className="px-5 py-3">Modelo</th>
                                            <th className="px-5 py-3">IMEI</th>
                                            <th className="px-5 py-3">Proveedor</th>
                                            <th className="px-5 py-3 text-center">Conexión</th>
                                            <th className="px-5 py-3 text-right">Precio ref.</th>
                                            <th className="px-5 py-3 w-20 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {inventarioGPSFiltrado.length > 0 ? inventarioGPSFiltrado.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <BadgeDisposicion estado={item.estado} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-slate-700">
                                                        {item.modelo?.marca ?? '—'}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-mono font-medium text-slate-600 tracking-wider text-xs">
                                                    {item.imei}
                                                </td>
                                                <td className="px-5 py-3 text-xs font-medium text-slate-500">
                                                    {item.proveedor?.nombre ?? '—'}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <BadgeEstado estado={item.estado_coneccion} />
                                                </td>
                                                <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">
                                                    {item.modelo?.costo_referencia != null ? `$${item.modelo.costo_referencia}` : (item.costo_compra != null ? `$${item.costo_compra}` : '—')}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    {item.estado === 'STOCK' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingItem(item)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-bold uppercase">
                                                    {filtroStockVendido === 'VENDIDOS' ? 'No hay dispositivos vendidos' : 'Bodega de GPS vacía'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* TABLA DE SIMS */}
                            {activeTab === 'SIMS' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-5 py-3">ICCID</th>
                                            <th className="px-5 py-3">Operadora</th>
                                            <th className="px-5 py-3">Número</th>
                                            <th className="px-5 py-3 text-right">Costo Mensual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sims.length > 0 ? sims.map((sim) => (
                                            <tr key={sim.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3 font-mono font-medium text-slate-600 tracking-wider text-xs">
                                                    {sim.iccid}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                                                        {sim.operadora || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-xs font-medium text-slate-500">
                                                    {sim.numero || 'Sin asignar'}
                                                </td>
                                                <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">
                                                    ${sim.costo_mensual || 0}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-bold uppercase">
                                                    Bodega de SIMs Vacía
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                        </div>
                    </div>
                </div>

            {/* Modal Crear / Ingreso (estilo overlay como referencia) */}
            {isCrearModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsCrearModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                Ingreso de mercadería (GPS)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCrearModalOpen(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            <FormIngresoGPS
                                embedded
                                onSuccess={() => {
                                    loadInventarioGPS();
                                    setIsCrearModalOpen(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar item GPS */}
            {editingItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setEditingItem(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Editar registro</h4>
                            <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">IMEI</label>
                                <div className="p-3 bg-slate-100 rounded-xl text-sm font-mono font-bold text-slate-600">
                                    {editingItem.imei}
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1">No editable</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Modelo</label>
                                <select
                                    value={editForm.modelo_id}
                                    onChange={e => setEditForm(prev => ({ ...prev, modelo_id: e.target.value }))}
                                    disabled={!editForm.proveedor_id}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        {editForm.proveedor_id ? "-- Seleccione --" : "Seleccione proveedor primero"}
                                    </option>
                                    {modelosFiltradosEdicion.map(m => (
                                        <option key={m.id} value={m.id}>{m.marca ?? "—"}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Proveedor</label>
                                <select
                                    value={editForm.proveedor_id}
                                    onChange={e => setEditForm(prev => ({ ...prev, proveedor_id: e.target.value }))}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Seleccione --</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Precio ($)</label>
                                <input
                                    type="number"
                                    value={editForm.costo_compra || ""}
                                    onChange={e => setEditForm(prev => ({ ...prev, costo_compra: parseFloat(e.target.value) || 0 }))}
                                    min={0}
                                    step={0.01}
                                    placeholder="Ref. modelo"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-[9px] text-slate-400 mt-1">Ref. modelo: ${modelos.find(m => m.id === editForm.modelo_id)?.costo_referencia ?? "—"}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Estado</label>
                                <select
                                    value={editForm.estado_coneccion}
                                    onChange={e => setEditForm(prev => ({ ...prev, estado_coneccion: e.target.value as EstadoConeccionGPS }))}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="online">Online</option>
                                    <option value="inactivo">Inactivo</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">SIM (opcional)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ICCID</label>
                                        <input
                                            type="text"
                                            value={editForm.sim_iccid}
                                            onChange={e => setEditForm(prev => ({ ...prev, sim_iccid: e.target.value }))}
                                            placeholder="8944474400003320009"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">IMSI</label>
                                        <input
                                            type="text"
                                            value={editForm.sim_imsi}
                                            onChange={e => setEditForm(prev => ({ ...prev, sim_imsi: e.target.value }))}
                                            placeholder="204080926651969"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleGuardarEdicion}
                                    disabled={savingEdit}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {savingEdit ? "Guardando..." : "Guardar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}