import React, { useState, useEffect } from "react";
import { 
    X, 
    Calendar, 
    MapPin, 
    AlignLeft, 
    Loader2,
    User
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

// Definimos el tipo exacto para el status según tu base de datos
type AppointmentStatus = "pendiente" | "confirmada" | "completada" | "cancelada" | "reprogramada" | "no_asistio";

export function AppointmentModal({ isOpen, onClose, onSuccess, initialLeadId = null }: AppointmentModalProps) {
    const { supabase, user } = useAuth();
    
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState<AppointmentFormData>({
        title: "",
        lead_id: initialLeadId,
        external_client_name: "",
        start_time: "",
        location: "",
        notes: ""
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                lead_id: initialLeadId || null
            }));
        }
    }, [isOpen, initialLeadId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            if (!formData.start_time) {
                throw new Error("La fecha de inicio es obligatoria.");
            }

            const startTime = new Date(formData.start_time);
            
            if (isNaN(startTime.getTime())) {
                throw new Error("La fecha de inicio no es válida.");
            }

            // Preparar payload
            // NOTA: Hemos eliminado end_time porque no aparecía en los tipos de error que enviaste.
            // Hemos asegurado que 'status' tenga el tipo correcto.
            const payload = {
                title: formData.title,
                lead_id: formData.lead_id ?? null,
                responsible_id: user.id,
                start_time: startTime.toISOString(),
                location: formData.location || null,
                notes: formData.notes || null,
                external_client_name: formData.external_client_name || null,
                status: "pendiente" as AppointmentStatus // Casting explícito para arreglar el error TS
            };

            console.log("Enviando payload a Supabase:", payload);

            const { error } = await supabase
                .from('appointments')
                .insert([payload]);

            if (error) {
                throw new Error(error.message || "Error al guardar en base de datos");
            }

            onSuccess();
            onClose();
            
            setFormData({
                title: "",
                lead_id: null,
                external_client_name: "",
                start_time: "",
                location: "",
                notes: ""
            });
        } catch (err: any) {
            console.error("Error creando cita:", err);
            const errorMessage = err.message || "Error al guardar.";
            alert(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-black">
                
                {/* Header Minimalista */}
                <div className="px-6 py-4 border-b border-black flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-black uppercase tracking-wide">Nueva Cita</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors" type="button">
                        <X className="h-6 w-6 text-black" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* Título */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase tracking-wider">
                            Asunto *
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Reunión Inicial"
                            className="w-full px-3 py-2 bg-white border border-gray-400 rounded focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder:text-gray-400 text-black"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* Cliente */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                            Cliente
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Nombre del contacto"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-400 rounded focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-black"
                                value={formData.external_client_name}
                                onChange={(e) => setFormData({...formData, external_client_name: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Fecha y Hora */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                            Fecha y Hora *
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-red-600" />
                            <input
                                required
                                type="datetime-local"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-400 rounded focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-black"
                                value={formData.start_time}
                                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Ubicación */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase tracking-wider">
                            Ubicación
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Lugar"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-400 rounded focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-black"
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                            Notas
                        </label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                            <textarea
                                rows={2}
                                placeholder="Detalles..."
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-400 rounded focus:border-black focus:ring-1 focus:ring-black resize-none outline-none transition-all text-black"
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-black text-black font-bold uppercase text-xs rounded hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-4 py-2 bg-black text-white font-bold uppercase text-xs rounded hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Agendar Cita"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}