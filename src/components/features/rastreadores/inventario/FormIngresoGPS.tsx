"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Package, AlertCircle } from "lucide-react";
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
        imei_input: "" // Aquí aceptaremos uno o varios (separados por enter)
    });

    // Cargar catálogos al montar
    useEffect(() => {
        const loadCatalogs = async () => {
            const [m, p] = await Promise.all([
                rastreadoresService.getModelos(),
                rastreadoresService.getProveedores()
            ]);
            setModelos(m);
            setProveedores(p);
        };
        loadCatalogs();
    }, []);

    // Autocompletar costo según modelo
    useEffect(() => {
        const mod = modelos.find(m => m.id === formData.modelo_id);
        if (mod) {
            setFormData(prev => ({ ...prev, costo_compra: mod.costo_referencia }));
        }
    }, [formData.modelo_id, modelos]);

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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20}/></div>
                <div>
                    <h3 className="font-bold text-slate-800 uppercase">Ingreso de Mercadería</h3>
                    <p className="text-xs text-slate-500 font-medium">Registro de dispositivos físicos a bodega</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Factura (Agrupador) */}
                <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Nro. Factura Proveedor</label>
                    <input 
                        type="text" 
                        value={formData.factura_compra}
                        onChange={e => setFormData({...formData, factura_compra: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="FAC-001..."
                    />
                </div>

                <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Proveedor</label>
                    <select 
                        value={formData.proveedor_id}
                        onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 uppercase outline-none"
                    >
                        <option value="">-- Seleccione --</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                </div>

                {/* Datos del Equipo */}
                <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Modelo</label>
                    <select 
                        value={formData.modelo_id}
                        onChange={e => setFormData({...formData, modelo_id: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 uppercase outline-none"
                    >
                        <option value="">-- Seleccione --</option>
                        {modelos.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.marca})</option>)}
                    </select>
                </div>

                <div className="col-span-2 md:col-span-1">
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
        </div>
    );
}