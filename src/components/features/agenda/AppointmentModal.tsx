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

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialLeadId?: number | null;
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

export function AppointmentModal({ isOpen, onClose, onSuccess, initialLeadId = null }: AppointmentModalProps) {
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
            setFormData(prev => ({
                ...prev,
                lead_id: initialLeadId || null
            }));
            // Pre-llenar fecha con la hora actual redondeada a la siguiente hora si está vacío
            if (!formData.start_time) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Ajuste local simple
                setFormData(prev => ({...prev, start_time: now.toISOString().slice(0, 16)}));
            }
            setError(null);
        }
    }, [isOpen, initialLeadId]);

    // Estilos reutilizables
    const inputClasses = "w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all pl-11 placeholder:text-slate-400 shadow-sm text-slate-700";
    const iconContainerClass = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10";
    
    // Modificado: Ahora siempre muestra que es obligatorio
    const InputLabel = ({ label }: { label: string }) => (
        <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
            {label}
            <span className="text-red-500 ml-1" title="Campo obligatorio">*</span>
        </label>
    );

    // Modificado: Ahora marca error en cualquier campo vacío
    const getErrorClass = (fieldName: keyof AppointmentFormData) => {
        // Si hay error general y el campo específico está vacío
        return error && !formData[fieldName]
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
            : '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError(null);

        // Validación Estricta de todos los campos
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

            const payload = {
                title: formData.title,
                lead_id: formData.lead_id ?? null,
                responsible_id: user.id,
                start_time: startTime.toISOString(),
                location: formData.location, // Ya no es opcional
                notes: formData.notes,       // Ya no es opcional
                external_client_name: formData.external_client_name, // Ya no es opcional
                status: "pendiente" as AppointmentStatus
            };

            const { error: dbError } = await supabase
                .from('appointments')
                .insert([payload]);

            if (dbError) {
                throw new Error(dbError.message || "Error al guardar en base de datos");
            }

            onSuccess();
            handleClose();
            
        } catch (err: any) {
            console.error("Error creando cita:", err);
            setError(err.message || "Ocurrió un error al guardar la cita.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: "",
            lead_id: null,
            external_client_name: "",
            start_time: "",
            location: "",
            notes: ""
        });
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded">
                                NUEVA
                            </span>
                            <h2 className="font-bold text-xl text-slate-900">Agendar Cita</h2>
                        </div>
                        <p className="text-sm text-slate-500">
                            Completa todos los campos para programar el evento.
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

                            {/* Lead ID Indicator (Si existe) */}
                            {initialLeadId && (
                                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>Se vinculará automáticamente al Lead #{initialLeadId}</span>
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
                    
                    {/* Mensaje de Error */}
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
                            disabled={loading || !isFormValid} // Deshabilitado si carga O si el form no es válido
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
                                    Confirmar Cita
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}