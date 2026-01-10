import React, { useState, useEffect } from "react";
import { 
    X, 
    Calendar, 
    MapPin, 
    AlignLeft, 
    Loader2,
    User,
    Type,
    Save,
    AlertCircle,
    Link as LinkIcon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AppointmentWithDetails } from "@/hooks/useAgenda";

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    
    // Props opcionales para diferentes modos
    initialLeadId?: number | null;
    appointmentToEdit?: AppointmentWithDetails | null; // MODO EDICIÓN
    initialData?: Partial<AppointmentFormData> | null; // MODO PRE-LLENADO (Desde Bot)
}

interface AppointmentFormData {
    title: string;
    lead_id: number | null;
    external_client_name: string;
    start_time: string;
    location: string;
    notes: string;
}

type AppointmentStatus = "pendiente" | "confirmada" | "completada" | "cancelada" | "reprogramada" | "no_asistio";

export function AppointmentModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    initialLeadId = null,
    appointmentToEdit = null,
    initialData = null
}: AppointmentModalProps) {
    const { supabase, user } = useAuth();
    
    // Estados
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<AppointmentFormData>({
        title: "",
        lead_id: initialLeadId,
        external_client_name: "",
        start_time: "",
        location: "",
        notes: ""
    });

    const isEditing = !!appointmentToEdit;
    const modalTitle = isEditing ? "Editar Cita" : "Agendar Cita";

    // Validar si todos los campos tienen datos
    const isFormValid = 
        formData.title.trim().length > 0 &&
        formData.external_client_name.trim().length > 0 &&
        formData.start_time.length > 0 &&
        formData.location.trim().length > 0 &&
        formData.notes.trim().length > 0;

    // Efectos
    useEffect(() => {
        if (isOpen) {
            setError(null);

            if (appointmentToEdit) {
                // MODO EDICIÓN: Cargar datos existentes
                const date = new Date(appointmentToEdit.start_time);
                // Ajuste para input datetime-local que requiere formato YYYY-MM-DDTHH:MM
                // Importante: toISOString() da UTC, necesitamos hora local para el input
                const localIsoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

                setFormData({
                    title: appointmentToEdit.title,
                    lead_id: appointmentToEdit.lead_id,
                    external_client_name: appointmentToEdit.external_client_name || "",
                    start_time: localIsoString,
                    location: appointmentToEdit.location || "",
                    notes: appointmentToEdit.notes || ""
                });
            } else if (initialData) {
                // MODO PRE-LLENADO (BOT)
                setFormData(prev => ({
                    ...prev,
                    title: initialData.title || "",
                    lead_id: initialLeadId || initialData.lead_id || null,
                    external_client_name: initialData.external_client_name || "",
                    start_time: initialData.start_time || "",
                    location: initialData.location || "",
                    notes: initialData.notes || ""
                }));

                // Si no hay fecha en initialData, poner default
                if (!initialData.start_time) setDefaultTime();

            } else {
                // MODO CREACIÓN LIMPIA
                setFormData({
                    title: "",
                    lead_id: initialLeadId || null,
                    external_client_name: "",
                    start_time: "",
                    location: "",
                    notes: ""
                });
                setDefaultTime();
            }
        }
    }, [isOpen, appointmentToEdit, initialLeadId, initialData]);

    const setDefaultTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setFormData(prev => ({...prev, start_time: now.toISOString().slice(0, 16)}));
    };

    // Estilos reutilizables
    const inputClasses = "w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all pl-11 placeholder:text-slate-400 shadow-sm text-slate-700";
    const iconContainerClass = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10";
    
    const InputLabel = ({ label }: { label: string }) => (
        <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
            {label}
            <span className="text-red-500 ml-1" title="Campo obligatorio">*</span>
        </label>
    );

    const getErrorClass = (fieldName: keyof AppointmentFormData) => {
        return error && !formData[fieldName]
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
            : '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError(null);

        if (!isFormValid) {
            setError("Todos los campos son obligatorios para guardar la cita.");
            return;
        }

        setLoading(true);
        try {
            const startTime = new Date(formData.start_time);
            
            if (isNaN(startTime.getTime())) {
                throw new Error("La fecha de inicio no es válida.");
            }

            // Datos comunes para ambos casos (Insert y Update)
            const commonData = {
                title: formData.title,
                lead_id: formData.lead_id ?? null,
                start_time: startTime.toISOString(),
                location: formData.location,
                notes: formData.notes,
                external_client_name: formData.external_client_name
            };

            let dbError;

            if (isEditing && appointmentToEdit) {
                // UPDATE: No necesitamos enviar responsible_id ni status default
                const { error } = await supabase
                    .from('appointments')
                    .update(commonData)
                    .eq('id', appointmentToEdit.id);
                dbError = error;
            } else {
                // INSERT: Aquí responsible_id es OBLIGATORIO, lo construimos explícitamente
                const insertPayload = {
                    ...commonData,
                    responsible_id: user.id, // TypeScript ahora ve que esto es obligatorio
                    status: "pendiente" as AppointmentStatus
                };

                const { error } = await supabase
                    .from('appointments')
                    .insert([insertPayload]);
                dbError = error;
            }

            if (dbError) {
                throw new Error(dbError.message || "Error al guardar en base de datos");
            }

            onSuccess();
            handleClose();
            
        } catch (err: any) {
            console.error("Error gestionando cita:", err);
            setError(err.message || "Ocurrió un error al guardar la cita.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            // Limpiar form después de cerrar animación
            setFormData({
                title: "",
                lead_id: null,
                external_client_name: "",
                start_time: "",
                location: "",
                notes: ""
            });
            setError(null);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-white text-xs font-bold px-2 py-0.5 rounded ${isEditing ? 'bg-amber-500' : 'bg-slate-900'}`}>
                                {isEditing ? 'EDITAR' : 'NUEVA'}
                            </span>
                            <h2 className="font-bold text-xl text-slate-900">{modalTitle}</h2>
                        </div>
                        <p className="text-sm text-slate-500">
                            {isEditing ? 'Modifica los detalles del evento.' : 'Completa los campos para programar.'}
                        </p>
                    </div>
                    <button 
                        onClick={handleClose} 
                        className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        type="button"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Body Scrollable */}
                <div className="overflow-y-auto custom-scrollbar bg-white flex-1">
                    <form id="appointment-form" onSubmit={handleSubmit} className="p-8 space-y-6">
                        
                        {/* Info Principal */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-5">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60">
                                <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                                    <Type className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800">Detalles Principales</h4>
                            </div>

                            {/* Título */}
                            <div>
                                <InputLabel label="Asunto / Título" />
                                <div className="relative">
                                    <div className={iconContainerClass}><Type className="h-5 w-5" /></div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: Reunión de seguimiento..."
                                        className={`${inputClasses} ${getErrorClass('title')}`}
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Cliente Externo */}
                            <div>
                                <InputLabel label="Cliente / Contacto" />
                                <div className="relative">
                                    <div className={iconContainerClass}><User className="h-5 w-5" /></div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Nombre del cliente"
                                        className={`${inputClasses} ${getErrorClass('external_client_name')}`}
                                        value={formData.external_client_name}
                                        onChange={(e) => setFormData({...formData, external_client_name: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Lead ID Indicator */}
                            {(initialLeadId || formData.lead_id) && (
                                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>Vinculado al Lead #{initialLeadId || formData.lead_id}</span>
                                </div>
                            )}
                        </div>

                        {/* Logística */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-5">
                                {/* Fecha y Hora */}
                                <div>
                                    <InputLabel label="Fecha y Hora de Inicio" />
                                    <div className="relative">
                                        <div className={iconContainerClass}><Calendar className="h-5 w-5 text-slate-500" /></div>
                                        <input
                                            required
                                            type="datetime-local"
                                            className={`${inputClasses} ${getErrorClass('start_time')}`}
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {/* Ubicación */}
                                <div>
                                    <InputLabel label="Ubicación" />
                                    <div className="relative">
                                        <div className={iconContainerClass}><MapPin className="h-5 w-5" /></div>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Oficina, Zoom, Dirección..."
                                            className={`${inputClasses} ${getErrorClass('location')}`}
                                            value={formData.location}
                                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <InputLabel label="Notas Adicionales" />
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-slate-400 pointer-events-none"><AlignLeft className="h-5 w-5" /></div>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Detalles importantes para la cita..."
                                        className={`${inputClasses} ${getErrorClass('notes')} h-auto py-3.5 resize-none leading-relaxed`}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-8 pt-4 bg-white border-t border-slate-50 sticky bottom-0 z-10 flex flex-col gap-4">
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <h4 className="font-bold text-red-900">Campos incompletos</h4>
                                <p className="text-red-700 mt-1 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            form="appointment-form"
                            disabled={loading || !isFormValid}
                            className={`
                                flex-[2] text-white font-bold text-sm uppercase tracking-wide py-4 rounded-xl shadow-xl shadow-slate-900/10 
                                transition-all flex justify-center items-center gap-2 
                                ${!isFormValid || loading ? 'opacity-50 cursor-not-allowed bg-slate-400' : 'bg-slate-900 hover:bg-slate-800 transform active:scale-[0.99]'}
                            `}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    {isEditing ? "Guardar Cambios" : "Confirmar Cita"}
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}