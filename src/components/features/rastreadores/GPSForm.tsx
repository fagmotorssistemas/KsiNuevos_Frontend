"use client";

import { useState, useEffect, useRef } from "react";
import { 
    Smartphone, Loader2, Save, Paperclip, 
    FileText, Image as ImageIcon, X, Trash2, Plus, ArrowLeft 
} from "lucide-react";
// CAMBIO: Usamos el servicio específico de rastreadores
import { rastreadoresService } from "@/services/rastreadores.service";
import { toast } from "sonner";

interface GPSFormProps {
    contratoId: string;
    facturaRuc: string;
    precioVenta: number;
    initialData?: any;
    onSuccess?: () => void; 
    onCancel?: () => void;
}

const MODELOS_TELTONIKA = [
    { id: 'FMC-920', label: 'FMC-920 (Básico/Motos)', costoDefault: 45 },
    { id: 'FMC-130', label: 'FMC-130 (Estándar 4G)', costoDefault: 65 },
    { id: 'FMC-150', label: 'FMC-150 (Maquinaria/CAN)', costoDefault: 85 },
];

export function GPSForm({ 
    contratoId, facturaRuc, precioVenta, 
    initialData, onSuccess, onCancel 
}: GPSFormProps) {
    const isEditing = !!initialData;
    const [loading, setLoading] = useState(false);
    
    const [form, setForm] = useState({
        imei: '',
        proveedor: 'TELTONIKA', 
        tipoDispositivo: 'Rastreador GPS',
        modelo: '', 
        pagado: false,
        metodoPago: 'TRANSFERENCIA',
        costo: 0
    });

    const [archivos, setArchivos] = useState<File[]>([]);
    const [oldEvidencias, setOldEvidencias] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData) {
            setForm({
                imei: initialData.imei || '',
                proveedor: initialData.proveedor || 'TELTONIKA',
                tipoDispositivo: initialData.tipo_dispositivo || 'Rastreador GPS',
                modelo: initialData.modelo || '',
                pagado: initialData.pagado || false,
                metodoPago: initialData.metodo_pago || 'TRANSFERENCIA',
                costo: initialData.costo_compra || 0
            });
            if (Array.isArray(initialData.evidencias)) setOldEvidencias(initialData.evidencias);
            else if (initialData.evidencia_url) setOldEvidencias([initialData.evidencia_url]);
        }
    }, [initialData]);

    useEffect(() => {
        if (!isEditing || (isEditing && form.modelo !== initialData?.modelo)) {
            const modeloInfo = MODELOS_TELTONIKA.find(m => m.id === form.modelo);
            if (modeloInfo) setForm(prev => ({ ...prev, costo: modeloInfo.costoDefault }));
        }
    }, [form.modelo, isEditing, initialData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // CORRECCIÓN TS: Añadido '|| []' para evitar error si files es null
        if (e.target.files && e.target.files.length > 0) {
            const nuevosArchivos = Array.from(e.target.files || []);
            setArchivos(prev => [...prev, ...nuevosArchivos]);
        }
    };

    const handleSave = async () => {
        if (!form.imei.trim()) return toast.error("El IMEI es obligatorio");
        if (!form.modelo) return toast.error("Seleccione un modelo");

        setLoading(true);
        try {
            let urlsFinales = [...oldEvidencias];
            
            if (archivos.length > 0) {
                // CAMBIO: Usar rastreadoresService
                const nuevas = await rastreadoresService.subirEvidencias(archivos);
                urlsFinales = [...urlsFinales, ...nuevas];
            }

            const payload = {
                identificacion_cliente: facturaRuc,
                nota_venta: contratoId,
                imei: form.imei.toUpperCase().trim(),
                modelo: form.modelo,
                tipo_dispositivo: form.tipoDispositivo,
                costo_compra: form.costo,
                precio_venta: precioVenta,
                proveedor: form.proveedor,
                pagado: form.pagado,
                metodo_pago: form.metodoPago.trim(),
                evidencias: urlsFinales
            };

            // CAMBIO: Usar rastreadoresService
            const res = isEditing 
                ? await rastreadoresService.actualizar(initialData.id, payload)
                : await rastreadoresService.registrar(payload);

            if (res.success) {
                toast.success(isEditing ? "GPS Actualizado" : "GPS Vinculado");
                setForm({ ...form, imei: '', modelo: '', costo: 0 });
                setArchivos([]); 
                setOldEvidencias([]);
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error || "Error al guardar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error crítico");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
            <div className={`px-6 py-5 border-b border-slate-50 flex justify-between items-center ${isEditing ? 'bg-amber-50' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Smartphone size={18} />
                    </div>
                    <div>
                        <h3 className={`text-[13px] font-black uppercase tracking-tight ${isEditing ? 'text-amber-700' : 'text-slate-900'}`}>
                            {isEditing ? 'Editando GPS' : 'Instalación GPS'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold">Vinculación Teltonika</p>
                    </div>
                </div>
                {isEditing && onCancel && (
                    <button onClick={onCancel} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase">
                        <ArrowLeft size={12}/> Cancelar
                    </button>
                )}
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-5">
                <div className="space-y-4">
                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block">Modelo</label>
                        <select value={form.modelo} onChange={(e) => setForm({...form, modelo: e.target.value})} className="w-full bg-slate-50 border-transparent text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 block p-3.5 outline-none uppercase cursor-pointer">
                            <option value="">-- Seleccionar --</option>
                            {MODELOS_TELTONIKA.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block">IMEI</label>
                        <input type="text" value={form.imei} onChange={(e) => setForm({...form, imei: e.target.value.replace(/[^0-9]/g, '').slice(0, 15)})} className="w-full bg-slate-50 border-transparent py-3.5 px-4 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none tracking-widest" placeholder="15 Dígitos" />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Evidencias</label>
                    </div>
                    {oldEvidencias.map((url, idx) => (
                        <div key={`old-${idx}`} className="flex justify-between p-2 mb-2 bg-slate-50 border border-slate-100 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-600 truncate">Evidencia #{idx+1}</span>
                            <button onClick={() => setOldEvidencias(p => p.filter((_, i) => i !== idx))}><X size={14} className="text-slate-400 hover:text-red-500"/></button>
                        </div>
                    ))}
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 flex justify-center gap-2 cursor-pointer hover:border-blue-400 group">
                        <Plus size={16} className="text-slate-400 group-hover:text-blue-500"/>
                        <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-blue-600">Agregar Foto/PDF</span>
                    </div>
                    {archivos.map((f, i) => <div key={i} className="text-[10px] mt-1 text-blue-600 font-bold ml-1">• {f.name}</div>)}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
                </div>
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                <button onClick={handleSave} disabled={loading} className={`w-full ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#E11D48] hover:bg-rose-700'} text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 flex justify-center gap-2`}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                    {isEditing ? "GUARDAR CAMBIOS" : "VINCULAR DISPOSITIVO"}
                </button>
            </div>
        </div>
    );
}