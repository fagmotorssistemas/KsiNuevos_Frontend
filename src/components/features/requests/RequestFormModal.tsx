import { useState } from "react";
import {
    X,
    Loader2,
    Plus,
    DollarSign,
    Calendar,
    User,
    CarFront,
    Palette,
    FileText,
    AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequestPriorityType } from "./constants";

interface RequestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface NewRequestState {
    brand: string;
    model: string;
    year_min: string;
    year_max: string;
    budget_max: string;
    color_preference: string;
    client_name: string;
    priority: RequestPriorityType;
    notes: string;
}

export default function RequestFormModal({ isOpen, onClose, onSuccess }: RequestFormModalProps) {
    const { supabase, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newRequest, setNewRequest] = useState<NewRequestState>({
        brand: '',
        model: '',
        year_min: '',
        year_max: '',
        budget_max: '',
        color_preference: '',
        client_name: '',
        priority: 'media',
        notes: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);

        const cleanBudget = newRequest.budget_max ? parseFloat(newRequest.budget_max) : null;
        const cleanYearMin = newRequest.year_min ? parseInt(newRequest.year_min) : null;
        const cleanYearMax = newRequest.year_max ? parseInt(newRequest.year_max) : null;

        const { error } = await supabase.from('vehicle_requests').insert({
            requested_by: user.id,
            brand: newRequest.brand,
            model: newRequest.model,
            year_min: cleanYearMin,
            year_max: cleanYearMax,
            budget_max: cleanBudget,
            color_preference: newRequest.color_preference || null,
            client_name: newRequest.client_name || null,
            priority: newRequest.priority,
            notes: newRequest.notes || null
        });

        if (!error) {
            onSuccess();
            onClose();
            setNewRequest({
                brand: '', model: '', year_min: '', year_max: '',
                budget_max: '', color_preference: '', client_name: '',
                priority: 'media', notes: ''
            });
        } else {
            console.error("Error creando pedido:", error);
            alert("Error al crear el pedido.");
        }
        setIsSubmitting(false);
    };

    // Componente de etiqueta mejorado con más espacio inferior
    const InputLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
        <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
            {label}
            {required ? (
                <span className="text-red-500 ml-1" title="Campo obligatorio">*</span>
            ) : (
                <span className="text-slate-400 font-normal text-[11px] ml-2 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded-full">
                    Opcional
                </span>
            )}
        </label>
    );

    // Inputs más altos (h-12) y con más padding a la izquierda para el icono
    const inputClasses = "w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all pl-11 placeholder:text-slate-400 shadow-sm";

    // Clase para centrar iconos verticalmente en los inputs más altos
    const iconContainerClass = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900">Nuevo Pedido</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Completa los detalles del vehículo deseado</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto custom-scrollbar bg-white">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">

                        {/* SECCIÓN 1: VEHÍCULO (Principal) */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-5">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60">
                                <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                                    <CarFront className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800">Datos del Vehículo</h4>
                            </div>

                            {/* Grid Responsivo: 1 columna en móvil, 2 en pantallas medianas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel label="Marca" required />
                                    <div className="relative">
                                        <div className={iconContainerClass}>
                                            <CarFront className="h-5 w-5" />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            className={inputClasses}
                                            placeholder="Ej: Toyota"
                                            value={newRequest.brand}
                                            onChange={e => setNewRequest({ ...newRequest, brand: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel label="Modelo" required />
                                    <div className="relative">
                                        <div className={iconContainerClass}>
                                            <CarFront className="h-5 w-5" />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            className={inputClasses}
                                            placeholder="Ej: Fortuner"
                                            value={newRequest.model}
                                            onChange={e => setNewRequest({ ...newRequest, model: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: DETALLES */}
                        <div className="space-y-6">
                            {/* Grid para años y prioridad: se adapta de 1 a 3 columnas */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div>
                                    <InputLabel label="Año Min" />
                                    <div className="relative">
                                        <div className={iconContainerClass}>
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <input type="number" className={inputClasses} placeholder="2018"
                                            value={newRequest.year_min} onChange={e => setNewRequest({ ...newRequest, year_min: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel label="Año Max" />
                                    <div className="relative">
                                        <div className={iconContainerClass}>
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <input type="number" className={inputClasses} placeholder="2024"
                                            value={newRequest.year_max} onChange={e => setNewRequest({ ...newRequest, year_max: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel label="Prioridad" />
                                    <div className="relative">
                                        <div className={iconContainerClass}>
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                        <select
                                            className={`${inputClasses} appearance-none cursor-pointer`}
                                            value={newRequest.priority}
                                            onChange={e => setNewRequest({ ...newRequest, priority: e.target.value as RequestPriorityType })}
                                        >
                                            <option value="baja">Baja</option>
                                            <option value="media">Media</option>
                                            <option value="alta">Alta</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel label="Presupuesto Máximo" />
                                    <div className="relative">
                                        <div className={iconContainerClass}>
                                            <DollarSign className="h-5 w-5 text-green-600" />
                                        </div>
                                        <input type="number" className={`${inputClasses} focus:ring-green-500/20 focus:border-green-600`} placeholder="0.00"
                                            value={newRequest.budget_max} onChange={e => setNewRequest({ ...newRequest, budget_max: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel label="Color Preferido" />
                                    <div className="relative">
                                        <div className={iconContainerClass}>
                                            <Palette className="h-5 w-5" />
                                        </div>
                                        <input type="text" className={inputClasses} placeholder="Ej: Blanco"
                                            value={newRequest.color_preference} onChange={e => setNewRequest({ ...newRequest, color_preference: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 3: CLIENTE Y NOTAS */}
                        <div className="pt-6 border-t border-slate-100 space-y-6">
                            <div>
                                <InputLabel label="Cliente / Referencia" />
                                <div className="relative">
                                    <div className={iconContainerClass}>
                                        <User className="h-5 w-5" />
                                    </div>
                                    <input type="text" className={inputClasses} placeholder="Nombre del interesado"
                                        value={newRequest.client_name} onChange={e => setNewRequest({ ...newRequest, client_name: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <InputLabel label="Notas Adicionales" />
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-slate-400 pointer-events-none">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <textarea
                                        rows={3}
                                        className={`${inputClasses} h-auto py-3.5 resize-none leading-relaxed`}
                                        placeholder="Escribe detalles específicos aquí (ej: transmisión automática, interior de cuero, sin choques...)"
                                        value={newRequest.notes}
                                        onChange={e => setNewRequest({ ...newRequest, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-8 pt-4 bg-white border-t border-slate-50 sticky bottom-0 z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-base py-4 rounded-xl shadow-xl shadow-slate-900/10 transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.99] hover:translate-y-[-1px]"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        Crear Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}