"use client";

import { useState } from "react";
import { 
    ShieldCheck, Building2, Briefcase, 
    BadgeDollarSign, Loader2, Save, FileText,
    AlertCircle
} from "lucide-react";
import { dispositivosService } from "@/services/dispositivos.service";
import { toast } from "sonner";

interface InsuranceFormProps {
    contratoId: string;
    facturaRuc: string;
    precioVenta: number;
    initialData: any[];
    onSuccess?: () => void; // <--- FIX: Propiedad agregada
}

export function InsuranceForm({ 
    contratoId, 
    facturaRuc, 
    precioVenta, 
    initialData,
    onSuccess 
}: InsuranceFormProps) {
    const [seguros, setSeguros] = useState(initialData);
    const [loading, setLoading] = useState(false);
    
    const [form, setForm] = useState({
        broker: '',
        aseguradora: '',
        tipoSeguro: '',
        costo: 0
    });

    const handleSave = async () => {
        if (!form.broker.trim() || !form.aseguradora.trim()) {
            return toast.error("Broker y Aseguradora son obligatorios");
        }

        setLoading(true);
        try {
            const res = await dispositivosService.registrarSeguro({
                identificacion_cliente: facturaRuc,
                nota_venta: contratoId,
                broker: form.broker.trim().toUpperCase(),
                aseguradora: form.aseguradora.trim().toUpperCase(),
                tipo_seguro: form.tipoSeguro.trim(),
                costo_seguro: form.costo,
                precio_venta: precioVenta
            });

            if (res.success) {
                toast.success("Póliza registrada correctamente");
                setForm({ broker: '', aseguradora: '', tipoSeguro: '', costo: 0 });
                const nuevos = await dispositivosService.obtenerSegurosPorNota(contratoId);
                setSeguros(nuevos);
                
                // FIX: Avisar al padre
                if (onSuccess) onSuccess();

            } else {
                toast.error(res.error || "Error al registrar la póliza");
            }
        } catch (err) {
            toast.error("Fallo de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <ShieldCheck size={18} />
                </div>
                <div>
                    <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                        Nueva Póliza
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                        Auditoría de cobertura
                    </p>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                    {/* Inputs Estilizados */}
                    <div className="space-y-1.5 group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Broker de Seguros</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={form.broker}
                                onChange={(e) => setForm({...form, broker: e.target.value})}
                                placeholder="Nombre comercial"
                                className="w-full border-b border-slate-200 py-2.5 text-[13px] text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                            />
                            <Briefcase className="absolute right-0 top-3 h-4 w-4 text-slate-300 group-focus-within:text-[#E11D48] transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-1.5 group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Aseguradora</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={form.aseguradora}
                                onChange={(e) => setForm({...form, aseguradora: e.target.value})}
                                placeholder="Compañía emisora"
                                className="w-full border-b border-slate-200 py-2.5 text-[13px] text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                            />
                            <Building2 className="absolute right-0 top-3 h-4 w-4 text-slate-300 group-focus-within:text-[#E11D48] transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5 group">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cobertura</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={form.tipoSeguro}
                                    onChange={(e) => setForm({...form, tipoSeguro: e.target.value})}
                                    placeholder="Total / Pérdida"
                                    className="w-full border-b border-slate-200 py-2 text-[13px] text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5 group">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Costo Plan ($)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={form.costo}
                                    onChange={(e) => setForm({...form, costo: parseFloat(e.target.value) || 0})}
                                    className="w-full border-b border-slate-200 py-2 text-[13px] font-mono font-bold text-slate-900 focus:border-[#E11D48] focus:border-b-2 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-4 border-t border-slate-50 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-[#E11D48] hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-100 active:scale-95"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                        Guardar Auditoría
                    </button>
                </div>
            </div>
        </div>
    );
}