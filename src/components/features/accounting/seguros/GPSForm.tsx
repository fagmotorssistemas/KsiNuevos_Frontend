"use client";

import { useState, useEffect, useRef } from "react";
import { 
    Smartphone, Loader2, Save, Paperclip, 
    FileText, Image as ImageIcon, X, Trash2, Plus, ArrowLeft 
} from "lucide-react";
import { dispositivosService } from "@/services/dispositivos.service";
import { toast } from "sonner";

interface GPSFormProps {
    contratoId: string;
    facturaRuc: string;
    precioVenta: number;
    initialData?: any; // Objeto con datos existentes para edición
    onSuccess?: () => void; 
    onCancel?: () => void; // Prop para cancelar edición
}

const MODELOS_TELTONIKA = [
    { id: 'FMC-920', label: 'FMC-920 (Básico/Motos)', costoDefault: 45 },
    { id: 'FMC-130', label: 'FMC-130 (Estándar 4G)', costoDefault: 65 },
    { id: 'FMC-150', label: 'FMC-150 (Maquinaria/CAN)', costoDefault: 85 },
];

export function GPSForm({ 
    contratoId, 
    facturaRuc, 
    precioVenta, 
    initialData, // Recibimos datos
    onSuccess,
    onCancel // Recibimos función cancelar
}: GPSFormProps) {
    const isEditing = !!initialData; // Bandera de edición
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
    const [oldEvidencias, setOldEvidencias] = useState<string[]>([]); // URLs ya existentes
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Efecto para Cargar Datos Iniciales (Modo Edición)
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

            // Manejo de evidencias (Array nuevo vs String viejo)
            if (Array.isArray(initialData.evidencias)) {
                setOldEvidencias(initialData.evidencias);
            } else if (initialData.evidencia_url) {
                setOldEvidencias([initialData.evidencia_url]);
            }
        }
    }, [initialData]);

    // Efecto costo default (Solo si cambia el modelo y NO estamos cargando data inicial por primera vez)
    useEffect(() => {
        // Evitamos sobreescribir el costo al cargar el formulario en modo edición
        if (!isEditing || (isEditing && form.modelo !== initialData?.modelo)) {
            const modeloInfo = MODELOS_TELTONIKA.find(m => m.id === form.modelo);
            if (modeloInfo) {
                setForm(prev => ({ ...prev, costo: modeloInfo.costoDefault }));
            }
        }
    }, [form.modelo, isEditing, initialData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const nuevosArchivos = Array.from(e.target.files);
            setArchivos(prev => [...prev, ...nuevosArchivos]);
        }
    };

    const removeFile = (index: number) => {
        setArchivos(prev => prev.filter((_, i) => i !== index));
    };

    // Función para remover evidencias viejas visualmente
    const removeOldEvidence = (index: number) => {
        setOldEvidencias(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!form.imei.trim()) return toast.error("El código IMEI es obligatorio");
        if (!form.modelo) return toast.error("Seleccione un modelo Teltonika");

        setLoading(true);
        try {
            // Combinar evidencias viejas con nuevas
            let urlsEvidenciaFinales = [...oldEvidencias];

            // 1. Subir Nuevos Archivos
            if (archivos.length > 0) {
                const nuevasUrls = await dispositivosService.subirEvidencias(archivos, 'gps');
                if (nuevasUrls.length > 0) {
                    urlsEvidenciaFinales = [...urlsEvidenciaFinales, ...nuevasUrls];
                } else {
                     toast.warning("Error subiendo nuevos archivos, se guardará con lo que hay.");
                }
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
                evidencias: urlsEvidenciaFinales
            };

            // 2. Guardar (Update o Create)
            let res;
            if (isEditing) {
                res = await dispositivosService.actualizarRastreador(initialData.id, payload);
            } else {
                res = await dispositivosService.registrarRastreador(payload);
            }

            if (res.success) {
                toast.success(isEditing ? "Registro Actualizado" : `Dispositivo ${form.modelo} vinculado`);
                
                // Reset
                setForm({
                    imei: '', proveedor: 'TELTONIKA', tipoDispositivo: 'Rastreador GPS',
                    modelo: '', pagado: false, metodoPago: 'TRANSFERENCIA', costo: 0
                });
                setArchivos([]); 
                setOldEvidencias([]);

                if (onSuccess) onSuccess(); 

            } else {
                toast.error(res.error || "Error al guardar registro");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error crítico al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
            {/* Header Dinámico */}
            <div className={`px-6 py-5 border-b border-slate-50 flex justify-between items-center ${isEditing ? 'bg-amber-50' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Smartphone size={18} />
                    </div>
                    <div>
                        <h3 className={`text-[13px] font-black uppercase tracking-tight ${isEditing ? 'text-amber-700' : 'text-slate-900'}`}>
                            {isEditing ? 'Editando Dispositivo' : 'Instalación GPS'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold">
                            Vinculación Teltonika
                        </p>
                    </div>
                </div>
                
                {/* Botón Cancelar (Solo en Edición) */}
                {isEditing && onCancel ? (
                    <button onClick={onCancel} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase tracking-wide">
                        <ArrowLeft size={12}/> Cancelar
                    </button>
                ) : (
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio Venta</p>
                        <p className="text-sm font-mono font-black text-slate-900">${precioVenta.toFixed(2)}</p>
                    </div>
                )}
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-5">
                
                {/* Inputs */}
                <div className="space-y-4">
                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block">
                            Modelo del Dispositivo
                        </label>
                        <div className="relative">
                            <select 
                                value={form.modelo}
                                onChange={(e) => setForm({...form, modelo: e.target.value})}
                                className="w-full bg-slate-50 border border-transparent text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white block p-3.5 outline-none appearance-none transition-all uppercase cursor-pointer"
                            >
                                <option value="">-- Seleccionar Modelo --</option>
                                {MODELOS_TELTONIKA.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block">
                            Código IMEI (15 Dígitos)
                        </label>
                        <input 
                            type="text" 
                            value={form.imei}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 15);
                                setForm({...form, imei: val});
                            }}
                            placeholder="Escanear o digitar..."
                            className="w-full bg-slate-50 border border-transparent py-3.5 px-4 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 tracking-widest"
                        />
                    </div>
                </div>

                {/* --- ZONA DE ARCHIVOS --- */}
                <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Evidencias</label>
                    </div>

                    {/* LISTA DE EVIDENCIAS EXISTENTES (SOLO EN EDICIÓN) */}
                    {oldEvidencias.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {oldEvidencias.map((url, idx) => (
                                <div key={`old-${idx}`} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 bg-white rounded-lg text-slate-400">
                                            <Paperclip size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">
                                                Evidencia Guardada #{idx + 1}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeOldEvidence(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Eliminar evidencia guardada"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* INPUT PARA AGREGAR NUEVOS */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                        <Plus size={16} className="text-slate-400 group-hover:text-blue-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-blue-600">
                            {archivos.length > 0 ? `Agregar Nuevos (${archivos.length})` : "Agregar Nueva Evidencia"}
                        </span>
                    </div>

                    {/* LISTA DE ARCHIVOS NUEVOS A SUBIR */}
                    {archivos.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {archivos.map((file, idx) => (
                                <div key={`new-${idx}`} className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 bg-white rounded-lg text-blue-600">
                                            {file.type.includes('image') ? <ImageIcon size={14} /> : <FileText size={14} />}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-900 truncate max-w-[150px]">{file.name}</p>
                                    </div>
                                    <button onClick={() => removeFile(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" multiple className="hidden" />
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Proveedor</span>
                        <span className="text-[10px] font-black text-slate-700 uppercase">TELTONIKA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Costo ($)</span>
                        <input 
                            type="number" 
                            value={form.costo}
                            onChange={(e) => setForm({...form, costo: parseFloat(e.target.value) || 0})}
                            className="bg-white border border-slate-200 rounded-lg w-20 py-1.5 px-2 text-right text-xs font-bold text-slate-900 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={loading || !form.imei || form.imei.length < 15}
                    className={`w-full ${isEditing ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-[#E11D48] hover:bg-rose-700 shadow-rose-100'} text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 active:shadow-none flex items-center justify-center gap-2`}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                    {isEditing ? "GUARDAR CAMBIOS" : "VINCULAR DISPOSITIVO"}
                </button>
            </div>
        </div>
    );
}