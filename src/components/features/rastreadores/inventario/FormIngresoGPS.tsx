"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Plus, Package, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { rastreadoresService } from "@/services/rastreadores.service";
import { ModeloGPS, ProveedorGPS } from "@/types/rastreadores.types";

export function FormIngresoGPS({ onSuccess }: { onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);

    // Catálogos
    const [modelos, setModelos] = useState<ModeloGPS[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorGPS[]>([]);

    // Formulario
    const [formData, setFormData] = useState({
        modelo_id: "",
        proveedor_id: "",
        factura_compra: "",
        costo_compra: 0,
        imei_input: ""
    });

    // Agregar nuevo proveedor / modelo (inline)
    const [showNewProveedor, setShowNewProveedor] = useState(false);
    const [newProveedorNombre, setNewProveedorNombre] = useState("");
    const [savingProveedor, setSavingProveedor] = useState(false);

    const [showNewModelo, setShowNewModelo] = useState(false);
    const [newModeloNombre, setNewModeloNombre] = useState("");
    const [newModeloMarca, setNewModeloMarca] = useState("");
    const [newModeloCosto, setNewModeloCosto] = useState<number>(0);
    const [savingModelo, setSavingModelo] = useState(false);

    const loadCatalogs = useCallback(async () => {
        const [m, p] = await Promise.all([
            rastreadoresService.getModelos(),
            rastreadoresService.getProveedores()
        ]);
        setModelos(m);
        setProveedores(p);
    }, []);

    useEffect(() => {
        loadCatalogs();
    }, [loadCatalogs]);

    // Autocompletar costo según modelo
    useEffect(() => {
        const mod = modelos.find(m => m.id === formData.modelo_id);
        if (mod) {
            setFormData(prev => ({ ...prev, costo_compra: mod.costo_referencia ?? 0 }));
        }
    }, [formData.modelo_id, modelos]);

    const handleAgregarProveedor = async () => {
        const nombre = newProveedorNombre.trim();
        if (!nombre) return toast.error("Escriba el nombre del proveedor");
        setSavingProveedor(true);
        try {
            const nuevo = await rastreadoresService.createProveedor(nombre);
            await loadCatalogs();
            setFormData(prev => ({ ...prev, proveedor_id: nuevo.id }));
            setNewProveedorNombre("");
            setShowNewProveedor(false);
            toast.success(`Proveedor "${nuevo.nombre}" agregado`);
        } catch (e: any) {
            toast.error(e?.message || "Error al crear proveedor");
        } finally {
            setSavingProveedor(false);
        }
    };

    const handleAgregarModelo = async () => {
        const nombre = newModeloNombre.trim();
        const marca = newModeloMarca.trim();
        if (!nombre) return toast.error("Escriba el nombre del modelo");
        setSavingModelo(true);
        try {
            const nuevo = await rastreadoresService.createModelo({
                nombre,
                marca: marca || "N/A",
                costo_referencia: newModeloCosto || undefined
            });
            await loadCatalogs();
            setFormData(prev => ({
                ...prev,
                modelo_id: nuevo.id,
                costo_compra: nuevo.costo_referencia ?? prev.costo_compra
            }));
            setNewModeloNombre("");
            setNewModeloMarca("");
            setNewModeloCosto(0);
            setShowNewModelo(false);
            toast.success(`Modelo "${nuevo.nombre}" agregado`);
        } catch (e: any) {
            toast.error(e?.message || "Error al crear modelo");
        } finally {
            setSavingModelo(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.modelo_id || !formData.proveedor_id || !formData.imei_input) {
            return toast.error("Complete los campos obligatorios");
        }

        setLoading(true);
        try {
            // Procesar IMEIs (separar por saltos de línea o comas y limpiar espacios)
            const imeis = formData.imei_input
                .split(/[\n,]+/) // Separa por enter o coma
                .map(i => i.trim())
                .filter(i => i.length > 0); // Elimina vacíos

            if (imeis.length === 0) return toast.error("Ingrese al menos un IMEI");

            // Crear array de payloads
            const lote = imeis.map(imei => ({
                imei: imei.toUpperCase(),
                modelo_id: formData.modelo_id,
                proveedor_id: formData.proveedor_id,
                factura_compra: formData.factura_compra.toUpperCase(),
                costo_compra: formData.costo_compra
            }));

            const res = await rastreadoresService.ingresarLoteGPS(lote);

            if (res.success) {
                toast.success(`${res.count} Dispositivos ingresados al inventario`);
                setFormData(prev => ({ ...prev, imei_input: "" })); // Limpiar solo IMEIs para seguir ingresando misma factura
                onSuccess();
            } else {
                toast.error(res.error || "Error al guardar (Verifique duplicados)");
            }

        } catch (error) {
            console.error(error);
            toast.error("Error crítico en el ingreso");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-w-0">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20}/></div>
                <div>
                    <h3 className="font-bold text-slate-800 uppercase">Ingreso de Mercadería</h3>
                    <p className="text-xs text-slate-500 font-medium">Registro de dispositivos físicos a bodega</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 min-w-0">
                {/* Factura (Agrupador) */}
                <div className="col-span-2 md:col-span-1 min-w-0">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Nro. Factura Proveedor</label>
                    <input 
                        type="text" 
                        value={formData.factura_compra}
                        onChange={e => setFormData({...formData, factura_compra: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="FAC-001..."
                    />
                </div>

                <div className="col-span-2 md:col-span-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Proveedor</label>
                        <button
                            type="button"
                            onClick={() => setShowNewProveedor(true)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                        >
                            <Plus size={12} /> Nuevo
                        </button>
                    </div>
                    <select
                        value={formData.proveedor_id}
                        onChange={e => setFormData({ ...formData, proveedor_id: e.target.value })}
                        className="w-full min-w-0 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Seleccione --</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                </div>

                {/* Datos del Equipo */}
                <div className="col-span-2 md:col-span-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Modelo</label>
                        <button
                            type="button"
                            onClick={() => setShowNewModelo(true)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                        >
                            <Plus size={12} /> Nuevo modelo
                        </button>
                    </div>
                    <select
                        value={formData.modelo_id}
                        onChange={e => setFormData({ ...formData, modelo_id: e.target.value })}
                        className="w-full min-w-0 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Seleccione --</option>
                        {modelos.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.marca})</option>)}
                    </select>
                </div>

                <div className="col-span-2 md:col-span-1 min-w-0">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Costo Unitario ($)</label>
                    <input 
                        type="number" 
                        value={formData.costo_compra}
                        onChange={e => setFormData({...formData, costo_compra: parseFloat(e.target.value) || 0})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 uppercase outline-none"
                    />
                </div>

                {/* Entrada Masiva de IMEIs */}
                <div className="col-span-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lista de IMEIs (Escanear o Pegar)</label>
                        <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Soporta múltiples líneas</span>
                    </div>
                    <textarea 
                        rows={4}
                        value={formData.imei_input}
                        onChange={e => setFormData({...formData, imei_input: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="865432040001234&#10;865432040001235&#10;..."
                    />
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} />
                        Los IMEIs duplicados no se guardarán.
                    </p>
                </div>
            </div>

            <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                {loading ? "Guardando..." : <><Save size={16} /> Guardar Ingreso</>}
            </button>

            {/* Overlay: Nueva tarjeta proveedor */}
            {showNewProveedor && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => { setShowNewProveedor(false); setNewProveedorNombre(""); }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Nuevo proveedor</h4>
                            <button
                                type="button"
                                onClick={() => { setShowNewProveedor(false); setNewProveedorNombre(""); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Nombre</label>
                                <input
                                    type="text"
                                    value={newProveedorNombre}
                                    onChange={e => setNewProveedorNombre(e.target.value)}
                                    placeholder="Nombre del proveedor"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                                    onKeyDown={e => e.key === "Enter" && handleAgregarProveedor()}
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleAgregarProveedor}
                                    disabled={savingProveedor}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {savingProveedor ? "Guardando..." : "Guardar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowNewProveedor(false); setNewProveedorNombre(""); }}
                                    className="px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay: Nueva tarjeta modelo */}
            {showNewModelo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => { setShowNewModelo(false); setNewModeloNombre(""); setNewModeloMarca(""); setNewModeloCosto(0); }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Nuevo modelo</h4>
                            <button
                                type="button"
                                onClick={() => { setShowNewModelo(false); setNewModeloNombre(""); setNewModeloMarca(""); setNewModeloCosto(0); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Nombre del modelo</label>
                                <input
                                    type="text"
                                    value={newModeloNombre}
                                    onChange={e => setNewModeloNombre(e.target.value)}
                                    placeholder="Ej. TK905"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Marca</label>
                                <input
                                    type="text"
                                    value={newModeloMarca}
                                    onChange={e => setNewModeloMarca(e.target.value)}
                                    placeholder="Ej. Concox"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Costo ref. ($)</label>
                                <input
                                    type="number"
                                    value={newModeloCosto || ""}
                                    onChange={e => setNewModeloCosto(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    min={0}
                                    step={0.01}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleAgregarModelo}
                                    disabled={savingModelo}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {savingModelo ? "Guardando..." : "Guardar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowNewModelo(false); setNewModeloNombre(""); setNewModeloMarca(""); setNewModeloCosto(0); }}
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