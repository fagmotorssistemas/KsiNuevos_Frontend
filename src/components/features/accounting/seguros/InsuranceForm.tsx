"use client";

import { useState, useEffect, useRef } from "react";
import { 
    ShieldCheck, Loader2, Save, 
    Paperclip, FileText, Image as ImageIcon, X, Trash2, Plus, ArrowLeft 
} from "lucide-react";
import { dispositivosService } from "@/services/dispositivos.service";
import { toast } from "sonner";

interface InsuranceFormProps {
    contratoId: string;
    facturaRuc: string;
    precioVenta: number;
    initialData?: any; // Objeto simple, no array
    onSuccess?: () => void;
    onCancel?: () => void; // Función para cancelar edición
}

// LISTAS MAESTRAS
const BROKERS_LIST = [
    "TECNISEGUROS", "AON", "NOVA", "ASESORES DE SEGUROS", "M&M", "DIRECTO (SIN BROKER)"
];

const ASEGURADORAS_LIST = [
    "CHUBB SEGUROS", "SWEADEN", "MAPFRE", "ECUASUIZA", "LATINA SEGUROS", "SEGUROS SUCRE"
];

const TIPOS_POLIZA = [
    "TODO RIESGO (1 AÑO)", "TODO RIESGO (2 AÑOS)", "PÉRDIDA TOTAL", "RESPONSABILIDAD CIVIL"
];

export function InsuranceForm({ 
    contratoId, 
    facturaRuc, 
    precioVenta, 
    initialData,
    onSuccess,
    onCancel
}: InsuranceFormProps) {
    const isEditing = !!initialData;
    const [loading, setLoading] = useState(false);
    
    // Estado del formulario
    const [form, setForm] = useState({
        broker: '',
        aseguradora: '',
        tipoSeguro: '',
        costo: 0
    });

    // Estado para múltiples archivos
    const [archivos, setArchivos] = useState<File[]>([]);
    const [oldEvidencias, setOldEvidencias] = useState<string[]>([]); // URLs ya guardadas
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar datos si estamos editando
    useEffect(() => {
        if (initialData) {
            setForm({
                broker: initialData.broker || '',
                aseguradora: initialData.aseguradora || '',
                tipoSeguro: initialData.tipo_seguro || '',
                costo: initialData.costo_seguro || 0
            });

            // Recuperar evidencias (Soporte Legacy string vs Nuevo Array)
            if (Array.isArray(initialData.evidencias)) {
                setOldEvidencias(initialData.evidencias);
            } else if (initialData.evidencia_url) {
                setOldEvidencias([initialData.evidencia_url]);
            }
        }
    }, [initialData]);

    // Manejo de selección múltiple (Archivos Nuevos)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const nuevosArchivos = Array.from(e.target.files);
            setArchivos(prev => [...prev, ...nuevosArchivos]);
        }
    };

    // Eliminar archivo nuevo de la lista de subida
    const removeFile = (index: number) => {
        setArchivos(prev => prev.filter((_, i) => i !== index));
    };

    // Eliminar evidencia vieja de la lista (Visualmente, se confirma al guardar)
    const removeOldEvidence = (index: number) => {
        setOldEvidencias(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!form.broker || !form.aseguradora) return toast.error("Complete los campos obligatorios");
        
        setLoading(true);
        try {
            // Combinar evidencias viejas + nuevas subidas
            let urlsEvidenciaFinales = [...oldEvidencias];

            // 1. Subir Nuevos Archivos
            if (archivos.length > 0) {
                const nuevasUrls = await dispositivosService.subirEvidencias(archivos, 'seguros');
                if (nuevasUrls.length > 0) {
                    urlsEvidenciaFinales = [...urlsEvidenciaFinales, ...nuevasUrls];
                } else {
                    toast.warning("Error subiendo algunos archivos, se guardará con lo disponible.");
                }
            }

            const payload = {
                identificacion_cliente: facturaRuc,
                nota_venta: contratoId,
                broker: form.broker,
                aseguradora: form.aseguradora,
                tipo_seguro: form.tipoSeguro,
                costo_seguro: form.costo,
                precio_venta: precioVenta,
                evidencias: urlsEvidenciaFinales
            };

            // 2. Guardar (Crear o Actualizar)
            let res;
            if (isEditing) {
                res = await dispositivosService.actualizarSeguro(initialData.id, payload);
            } else {
                res = await dispositivosService.registrarSeguro(payload);
            }

            if (res.success) {
                toast.success(isEditing ? "Póliza Actualizada" : "Póliza Registrada");
                
                // Reset si es creación, o mantener si es edición (opcional, aquí reseteamos para limpiar)
                if (!isEditing) {
                    setForm({ broker: '', aseguradora: '', tipoSeguro: '', costo: 0 });
                    setArchivos([]);
                    setOldEvidencias([]);
                }
                
                if (onSuccess) onSuccess();

            } else {
                toast.error(res.error || "Error al procesar la solicitud");
            }
        } catch (err) {
            console.error(err);
            toast.error("Fallo crítico de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
            {/* Header: Cambia de color si es Edición */}
            <div className={`px-6 py-5 border-b border-slate-50 flex justify-between items-center ${isEditing ? 'bg-amber-50' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <ShieldCheck size={18} />
                    </div>
                    <div>
                        <h3 className={`text-[13px] font-black uppercase tracking-tight ${isEditing ? 'text-amber-700' : 'text-slate-900'}`}>
                            {isEditing ? 'Editando Póliza' : 'Emisión Póliza'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold">
                            Gestión de Seguros
                        </p>
                    </div>
                </div>
                
                {/* Botón Cancelar (Solo en edición) */}
                {isEditing && onCancel ? (
                    <button 
                        onClick={onCancel}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase tracking-wide transition-colors"
                    >
                        <ArrowLeft size={12}/> Cancelar
                    </button>
                ) : (
                    <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Venta</span>
                        <span className="text-xs font-mono font-black text-slate-900">${precioVenta.toFixed(2)}</span>
                    </div>
                )}
            </div>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* Inputs Modernos */}
                <div className="space-y-4">
                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block">Broker</label>
                        <div className="relative">
                            <select 
                                value={form.broker}
                                onChange={(e) => setForm({...form, broker: e.target.value})}
                                className="w-full bg-slate-50 border border-transparent text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white block p-3.5 outline-none appearance-none transition-all uppercase cursor-pointer"
                            >
                                <option value="">Seleccionar Broker...</option>
                                {BROKERS_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block">Aseguradora</label>
                        <div className="relative">
                            <select 
                                value={form.aseguradora}
                                onChange={(e) => setForm({...form, aseguradora: e.target.value})}
                                className="w-full bg-slate-50 border border-transparent text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white block p-3.5 outline-none appearance-none transition-all uppercase cursor-pointer"
                            >
                                <option value="">Seleccionar Aseguradora...</option>
                                {ASEGURADORAS_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block">Tipo de Plan</label>
                        <div className="relative">
                            <select 
                                value={form.tipoSeguro}
                                onChange={(e) => setForm({...form, tipoSeguro: e.target.value})}
                                className="w-full bg-slate-50 border border-transparent text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white block p-3.5 outline-none appearance-none transition-all uppercase cursor-pointer"
                            >
                                <option value="">Seleccionar Tipo...</option>
                                {TIPOS_POLIZA.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- ZONA DE CARGA DE ARCHIVOS --- */}
                <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">
                            Póliza Digital ({oldEvidencias.length + archivos.length})
                        </label>
                    </div>

                    {/* 1. LISTA DE EVIDENCIAS VIEJAS (Solo en modo edición) */}
                    {oldEvidencias.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {oldEvidencias.map((url, idx) => (
                                <div key={`old-${idx}`} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 bg-white rounded-lg text-slate-400">
                                            {/* Icono genérico ya que no tenemos el tipo de archivo real sin hacer request */}
                                            <Paperclip size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-slate-600 truncate max-w-[180px]">
                                                Documento Guardado #{idx + 1}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeOldEvidence(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Eliminar este documento al guardar"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* 2. BOTÓN DE CARGA DE NUEVOS */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                    >
                        <Plus size={16} className="text-slate-400 group-hover:text-emerald-500"/>
                        <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-emerald-600">
                            {archivos.length > 0 ? `Adjuntar Nuevos (${archivos.length})` : "Adjuntar Documentos"}
                        </span>
                    </div>

                    {/* 3. LISTA DE ARCHIVOS NUEVOS A SUBIR */}
                    {archivos.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {archivos.map((file, idx) => (
                                <div key={`new-${idx}`} className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 bg-white rounded-lg text-emerald-600">
                                            {file.type.includes('image') ? <ImageIcon size={14} /> : <FileText size={14} />}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-900 truncate max-w-[150px]">
                                            {file.name}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => removeFile(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Input Oculto (Múltiple) */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        multiple 
                        className="hidden" 
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                <div className="flex justify-between items-center mb-4 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Costo Neto</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">$</span>
                        <input 
                            type="number" 
                            value={form.costo}
                            onChange={(e) => setForm({...form, costo: parseFloat(e.target.value) || 0})}
                            className="bg-white border border-slate-200 rounded-lg w-20 py-1.5 px-2 text-right text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className={`w-full ${isEditing ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-[#E11D48] hover:bg-rose-700 shadow-rose-100'} text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 active:shadow-none flex items-center justify-center gap-2`}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                    {isEditing ? "GUARDAR CAMBIOS" : "GUARDAR PÓLIZA"}
                </button>
            </div>
        </div>
    );
}