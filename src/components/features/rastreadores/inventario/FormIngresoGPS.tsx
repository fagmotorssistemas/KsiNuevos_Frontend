"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Save, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { rastreadoresService } from "@/services/rastreadores.service";
import { ModeloGPS, ProveedorGPS, type EstadoConeccionGPS } from "@/types/rastreadores.types";

interface FormIngresoGPSProps {
    onSuccess: () => void;
    /** En true no muestra la tarjeta ni el encabezado (para usar dentro de modal) */
    embedded?: boolean;
}

export function FormIngresoGPS({ onSuccess, embedded }: FormIngresoGPSProps) {
    const [loading, setLoading] = useState(false);
    const [modoIngreso, setModoIngreso] = useState<"SELECCIONAR" | "CREAR">("SELECCIONAR");
    const [modoProveedorCrear, setModoProveedorCrear] = useState<"EXISTENTE" | "NUEVO">("EXISTENTE");

    // Catálogos
    const [modelos, setModelos] = useState<ModeloGPS[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorGPS[]>([]);

    // Formulario
    const [formData, setFormData] = useState({
        modelo_id: "",
        proveedor_id: "",
        factura_compra: "",
        costo_compra: 0,
        estado_coneccion: "offline" as EstadoConeccionGPS,
        imei_input: ""
    });

    // Vista CREAR (directo, sin "+Nuevo")
    const [crearProveedorNombre, setCrearProveedorNombre] = useState("");
    const [crearModeloNombre, setCrearModeloNombre] = useState("");
    const [crearCostoRef, setCrearCostoRef] = useState<number>(0);

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

    const modelosFiltrados = useMemo(() => {
        const proveedorId = formData.proveedor_id;
        if (!proveedorId) return [];
        return modelos.filter(m => (m as any)?.provedor_id === proveedorId);
    }, [formData.proveedor_id, modelos]);

    const handleSubmit = async () => {
        if (modoIngreso === "SELECCIONAR" && !formData.imei_input) {
            return toast.error("Ingrese al menos un IMEI");
        }

        setLoading(true);
        try {
            let proveedorId = formData.proveedor_id;
            let modeloId = formData.modelo_id;
            let costoRef = 0;

            if (modoIngreso === "CREAR") {
                const provNombre = crearProveedorNombre.trim();
                const modNombre = crearModeloNombre.trim();

                if (modoProveedorCrear === "NUEVO" && !provNombre) {
                    return toast.error("Escriba el proveedor");
                }
                if (!modNombre) return toast.error("Escriba el modelo");

                let provIdFinal = proveedorId;
                if (modoProveedorCrear === "NUEVO") {
                    const prov = await rastreadoresService.createProveedor(provNombre);
                    provIdFinal = prov.id;
                } else {
                    if (!proveedorId) return toast.error("Seleccione un proveedor existente");
                }

                const mod = await rastreadoresService.createModelo({
                    marca: modNombre,
                    costo_referencia: crearCostoRef || undefined,
                    provedor_id: provIdFinal!
                });

                proveedorId = provIdFinal!;
                modeloId = mod.id;
                costoRef = mod.costo_referencia ?? crearCostoRef ?? 0;

                await loadCatalogs();
                setFormData(prev => ({ ...prev, proveedor_id: proveedorId, modelo_id: modeloId, costo_compra: costoRef }));
            } else {
                if (!proveedorId || !modeloId) return toast.error("Seleccione proveedor y modelo");
                costoRef = modelos.find(m => m.id === modeloId)?.costo_referencia ?? formData.costo_compra ?? 0;
            }

            if (modoIngreso === "SELECCIONAR") {
                // Procesar IMEIs (separar por saltos de línea o comas y limpiar espacios)
                const imeis = formData.imei_input
                    .split(/[\n,]+/) // Separa por enter o coma
                    .map(i => i.trim())
                    .filter(i => i.length > 0); // Elimina vacíos

                if (imeis.length === 0) return toast.error("Ingrese al menos un IMEI");

                const lote = imeis.map(imei => ({
                    imei: imei.toUpperCase(),
                    modelo_id: modeloId,
                    proveedor_id: proveedorId,
                    factura_compra: formData.factura_compra.toUpperCase(),
                    costo_compra: Number(costoRef),
                    estado_coneccion: formData.estado_coneccion
                }));

                const res = await rastreadoresService.ingresarLoteGPS(lote);

                if (res.success) {
                    toast.success(`${res.count} Dispositivos ingresados al inventario`);
                    setFormData(prev => ({ ...prev, imei_input: "" })); // Limpiar solo IMEIs para seguir ingresando misma factura
                    onSuccess();
                } else {
                    toast.error(res.error || "Error al guardar (Verifique duplicados)");
                }
            } else {
                // Solo crear proveedor/modelo, sin ingresar stock
                toast.success("Proveedor y modelo creados correctamente");
                setCrearProveedorNombre("");
                setCrearModeloNombre("");
                setCrearCostoRef(0);
            }

        } catch (error) {
            console.error(error);
            toast.error("Error crítico en el ingreso");
        } finally {
            setLoading(false);
        }
    };

    const formContent = (
            <div className={embedded ? "p-0" : "p-4 sm:p-5"}>
                {embedded && (
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 w-fit mb-4">
                        <button type="button" onClick={() => setModoIngreso("SELECCIONAR")} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${modoIngreso === "SELECCIONAR" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Seleccionar</button>
                        <button type="button" onClick={() => setModoIngreso("CREAR")} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${modoIngreso === "CREAR" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"}`}>Crear</button>
                    </div>
                )}
                {/* Fila 1: Factura + Proveedor */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="min-w-0">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Nro. factura</label>
                        <input
                            type="text"
                            value={formData.factura_compra}
                            onChange={e => setFormData({ ...formData, factura_compra: e.target.value })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="FAC-001..."
                        />
                    </div>

                    {modoIngreso === "SELECCIONAR" ? (
                        <div className="min-w-0">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Proveedor</label>
                            <select
                                value={formData.proveedor_id}
                                onChange={e => setFormData(prev => ({ ...prev, proveedor_id: e.target.value, modelo_id: "" }))}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Seleccione --</option>
                                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Proveedor</label>
                                <div className="flex rounded-lg border border-emerald-200 overflow-hidden text-[9px] font-black uppercase">
                                    <button type="button" onClick={() => setModoProveedorCrear("EXISTENTE")} className={`px-2 py-1 ${modoProveedorCrear === "EXISTENTE" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"}`}>Existente</button>
                                    <button type="button" onClick={() => setModoProveedorCrear("NUEVO")} className={`px-2 py-1 ${modoProveedorCrear === "NUEVO" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"}`}>Nuevo</button>
                                </div>
                            </div>
                            {modoProveedorCrear === "EXISTENTE" ? (
                                <select value={formData.proveedor_id} onChange={e => setFormData(prev => ({ ...prev, proveedor_id: e.target.value }))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="">-- Seleccione --</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            ) : (
                                <input type="text" value={crearProveedorNombre} onChange={e => setCrearProveedorNombre(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 uppercase focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ej. Teltonika" />
                            )}
                        </div>
                    )}
                </div>

                {/* Fila 2: Modelo + Precio ref. / Estado (o Modelo crear + Costo en CREAR) */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    {modoIngreso === "SELECCIONAR" ? (
                        <>
                            <div className="min-w-0">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Modelo</label>
                                <select
                                    value={formData.modelo_id}
                                    onChange={e => setFormData({ ...formData, modelo_id: e.target.value })}
                                    disabled={!formData.proveedor_id}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{formData.proveedor_id ? "-- Seleccione --" : "Proveedor primero"}</option>
                                    {modelosFiltrados.map((m) => <option key={m.id} value={m.id}>{m.marca ?? "—"}</option>)}
                                </select>
                                {formData.proveedor_id && modelosFiltrados.length === 0 && <p className="text-[9px] text-amber-600 font-bold mt-1">Sin modelos para este proveedor.</p>}
                            </div>
                            <div className="min-w-0">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Precio ref.</label>
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 min-w-0">
                                    {formData.modelo_id ? (
                                        <span className="text-sm font-mono font-black text-slate-800 truncate">
                                            {(() => {
                                                const mod = modelos.find(m => m.id === formData.modelo_id);
                                                return mod?.costo_referencia != null ? `$${mod.costo_referencia}` : "—";
                                            })()}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400">Seleccione modelo</span>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="min-w-0">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Modelo (crear)</label>
                                <input type="text" value={crearModeloNombre} onChange={e => setCrearModeloNombre(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 uppercase focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ej. FMC130" />
                            </div>
                            <div className="min-w-0">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Costo ref. ($)</label>
                                <input type="number" value={crearCostoRef || ""} onChange={e => setCrearCostoRef(parseFloat(e.target.value) || 0)} placeholder="0" min={0} step={0.01} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                        </>
                    )}
                </div>

                {/* Fila 3: Estado (solo SELECCIONAR) */}
                {modoIngreso === "SELECCIONAR" && (
                    <div className="mb-4 max-w-48">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Estado</label>
                        <select
                            value={formData.estado_coneccion}
                            onChange={e => setFormData(prev => ({ ...prev, estado_coneccion: e.target.value as EstadoConeccionGPS }))}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="online">Online</option>
                            <option value="inactivo">Inactivo</option>
                            <option value="offline">Offline</option>
                        </select>
                    </div>
                )}

                {/* Lista de IMEIs (solo SELECCIONAR) */}
                {modoIngreso === "SELECCIONAR" && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Lista de IMEIs (escanear o pegar)</label>
                        <textarea
                            rows={3}
                            value={formData.imei_input}
                            onChange={e => setFormData({ ...formData, imei_input: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                            placeholder="865432040001234&#10;865432040001235 ..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <AlertCircle size={10} className="shrink-0" />
                            Múltiples líneas o comas. Duplicados no se guardan.
                        </p>
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {loading ? "Guardando..." : <><Save size={16} /> {modoIngreso === "SELECCIONAR" ? "Guardar ingreso" : "Guardar catálogo"}</>}
                </button>
            </div>
    );

    if (embedded) return formContent;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-xl overflow-hidden border-l-4 border-l-blue-500">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0"><Package size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">Ingreso de mercadería</h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Registro de dispositivos a bodega</p>
                    </div>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
                    <button type="button" onClick={() => setModoIngreso("SELECCIONAR")} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${modoIngreso === "SELECCIONAR" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Seleccionar</button>
                    <button type="button" onClick={() => setModoIngreso("CREAR")} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${modoIngreso === "CREAR" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"}`}>Crear</button>
                </div>
            </div>
            {formContent}
        </div>
    );
}