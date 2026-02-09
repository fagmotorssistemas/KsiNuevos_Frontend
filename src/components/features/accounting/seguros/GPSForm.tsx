"use client";

import { useState } from "react";
import { 
    Smartphone, Loader2, Save, CheckCircle, 
    Circle, AlertCircle, CheckCircle2 
} from "lucide-react";
import { dispositivosService } from "@/services/dispositivos.service";
import { toast } from "sonner";

interface GPSFormProps {
    contratoId: string;
    facturaRuc: string;
    precioVenta: number;
    initialData?: any[];
    onSuccess?: () => void; // <--- FIX: Propiedad agregada
}

export function GPSForm({ 
    contratoId, 
    facturaRuc, 
    precioVenta, 
    initialData = [],
    onSuccess 
}: GPSFormProps) {
    const [loading, setLoading] = useState(false);
    const [dispositivos, setDispositivos] = useState(initialData); 
    
    const [form, setForm] = useState({
        imei: '',
        proveedor: '',
        tipoDispositivo: '',
        modelo: '',
        pagado: false,
        metodoPago: '',
        costo: 0
    });

    const handleSave = async () => {
        if (!form.imei.trim()) {
            return toast.error("El código IMEI es obligatorio");
        }

        setLoading(true);
        try {
            const res = await dispositivosService.registrarRastreador({
                identificacion_cliente: facturaRuc,
                nota_venta: contratoId,
                imei: form.imei.toUpperCase().trim(),
                modelo: form.modelo.trim(),
                tipo_dispositivo: form.tipoDispositivo.trim(),
                costo_compra: form.costo,
                precio_venta: precioVenta,
                proveedor: form.proveedor.trim(),
                pagado: form.pagado,
                metodo_pago: form.metodoPago.trim()
            });

            if (res.success) {
                toast.success("Dispositivo vinculado correctamente");
                
                setForm({
                    imei: '', proveedor: '', tipoDispositivo: '',
                    modelo: '', pagado: false, metodoPago: '', costo: 0
                });

                // Refrescar lista local
                const actualizados = await dispositivosService.obtenerRastreadoresPorNota(contratoId);
                setDispositivos(actualizados);
                
                // FIX: Avisar al padre para recargar auditoría general
                if (onSuccess) onSuccess(); 

            } else {
                toast.error(res.error || "No se pudo completar el registro");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
            {/* Header Limpio */}
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <Smartphone size={18} />
                </div>
                <div>
                    <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                        Nuevo Rastreador
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                        Registro de IMEI y costos
                    </p>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 gap-6">
                    {/* Input Estilizado: IMEI */}
                    <div className="space-y-1.5 group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código IMEI</label>
                        <input 
                            type="text" 
                            value={form.imei}
                            onChange={(e) => setForm({...form, imei: e.target.value})}
                            placeholder="00000000000000"
                            className="w-full border-b border-slate-200 py-2.5 text-sm font-mono text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Modelo</label>
                            <input 
                                type="text" 
                                value={form.modelo}
                                onChange={(e) => setForm({...form, modelo: e.target.value})}
                                placeholder="Ej: GV300"
                                className="w-full border-b border-slate-200 py-2 text-[13px] text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Proveedor</label>
                            <input 
                                type="text" 
                                value={form.proveedor}
                                onChange={(e) => setForm({...form, proveedor: e.target.value})}
                                placeholder="Ej: HUNTER"
                                className="w-full border-b border-slate-200 py-2 text-[13px] text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipo</label>
                            <input 
                                type="text" 
                                value={form.tipoDispositivo}
                                onChange={(e) => setForm({...form, tipoDispositivo: e.target.value})}
                                placeholder="Fijo / Portátil"
                                className="w-full border-b border-slate-200 py-2 text-[13px] text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pago Prov.</label>
                            <input 
                                type="text" 
                                value={form.metodoPago}
                                onChange={(e) => setForm({...form, metodoPago: e.target.value})}
                                placeholder="Transferencia"
                                className="w-full border-b border-slate-200 py-2 text-[13px] text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Costo Compra ($)</label>
                            <input 
                                type="number" 
                                value={form.costo}
                                onChange={(e) => setForm({...form, costo: parseFloat(e.target.value) || 0})}
                                className="w-full border-b border-slate-200 py-2 text-[13px] font-mono font-bold text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-end pb-1">
                             <button 
                                onClick={() => setForm({...form, pagado: !form.pagado})}
                                className={`w-full py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    form.pagado 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                {form.pagado ? <CheckCircle size={14} /> : <Circle size={14} />}
                                {form.pagado ? 'Pagado' : 'Pendiente'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-50 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-[#E11D48] hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-100 active:scale-95"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                        Guardar Dispositivo
                    </button>
                </div>
            </div>
        </div>
    );
}