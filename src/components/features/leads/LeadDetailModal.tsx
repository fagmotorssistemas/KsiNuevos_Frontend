import { useState, useEffect, FormEvent } from "react";
import {
    X,
    Clock,
    Phone,
    MessageCircle,
    User,
    Car,
    Send,
    FileText,
    Edit3,
    CheckCircle2,
    Loader2
} from "lucide-react";

// Hooks y Tipos
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";
import type { LeadWithDetails } from "../../../hooks/useLeads"; // Importamos el tipo compartido

// Componentes UI Básicos Mejorados
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`flex w-full outline-none transition-all duration-200 ${className}`}
        {...props}
    />
);

const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        className={`flex w-full outline-none transition-all duration-200 ${className}`}
        {...props}
    />
);

const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        className={`inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${className}`}
        {...props}
    >
        {children}
    </button>
);


type Interaction = Database['public']['Tables']['interactions']['Row'];

interface LeadDetailModalProps {
    lead: LeadWithDetails;
    onClose: () => void;
}

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
    const { supabase, user } = useAuth();

    // Estados locales
    const [resume, setResume] = useState(lead.resume || "");
    const [isSavingResume, setIsSavingResume] = useState(false);

    // Estados para interacciones
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [newInteractionNote, setNewInteractionNote] = useState("");
    const [interactionType, setInteractionType] = useState<string>("llamada");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Cargar historial al abrir
    useEffect(() => {
        const fetchInteractions = async () => {
            const { data } = await supabase
                .from('interactions')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });

            if (data) setInteractions(data);
        };

        fetchInteractions();
    }, [lead.id, supabase]);

    // 2. Guardar Resumen Ejecutivo (Auto-save on blur)
    const handleSaveResume = async () => {
        // Solo guardamos si hubo cambios
        if (resume === lead.resume) return;

        setIsSavingResume(true);
        const { error } = await supabase
            .from('leads')
            .update({ resume: resume })
            .eq('id', lead.id);

        if (error) {
            console.error("Error guardando resumen:", error);
        } else {
            // Opcional: Feedback visual o actualización de contexto
        }
        setIsSavingResume(false);
    };

    // 3. Crear Nueva Interacción
    const handleSubmitInteraction = async (e: FormEvent) => {
        e.preventDefault();
        if (!newInteractionNote.trim() || !user) return;

        setIsSubmitting(true);

        const { data, error } = await supabase
            .from('interactions')
            .insert({
                lead_id: lead.id,
                type: interactionType as any, // Cast a enum de la DB
                content: newInteractionNote,
                result: 'completado',
                responsible_id: user.id
            })
            .select()
            .single();

        if (error) {
            console.error("Error creando interacción:", error);
        } else if (data) {
            setInteractions([data, ...interactions]);
            setNewInteractionNote("");
        }
        setIsSubmitting(false);
    };

    // Helper para iconos
    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'llamada': return <Phone className="h-4 w-4 text-blue-500" />;
            case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-500" />;
            case 'visita': return <User className="h-4 w-4 text-purple-500" />;
            default: return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Contenedor Principal con animación de zoom */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">

                {/* --- HEADER --- */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500 font-medium">{lead.phone || 'Sin teléfono'}</span>
                            {/* <span className="text-slate-300">•</span> */}
                            {/* <span className="text-sm text-slate-500">{lead.email || 'Sin email'}</span> */}
                            <span className="text-slate-300">•</span>
                            <span className="text-sm text-slate-500 capitalize">{lead.source}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* --- COLUMNA IZQUIERDA (Info Estática & Resumen) --- */}
                    <div className="w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto custom-scrollbar">

                        {/* Sección 1: Resumen Ejecutivo Mejorado */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Edit3 className="h-3 w-3" /> Resumen
                                </label>
                                <div className="flex items-center gap-1.5 h-4">
                                    {isSavingResume ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                                            <span className="text-[10px] text-brand-600 font-medium">Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                            <span className="text-[10px] text-slate-400 font-medium">Guardado</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <TextArea
                                value={resume || ''}
                                onChange={(e) => setResume(e.target.value)}
                                onBlur={handleSaveResume}
                                placeholder="Escribe aquí el estatus actual del cliente para el reporte..."
                                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm min-h-[140px] resize-none leading-relaxed"
                            />
                        </div>

                        {/* Sección 2: Vehículos */}
                        <div className="mb-8">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                                Vehículos de Interés
                            </label>
                            {lead.interested_cars && lead.interested_cars.length > 0 ? (
                                <div className="space-y-3">
                                    {lead.interested_cars.map((car) => (
                                        <div key={car.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1.5 bg-brand-50 rounded-lg">
                                                    <Car className="h-4 w-4 text-brand-600" />
                                                </div>
                                                <span className="font-semibold text-slate-800">{car.brand} {car.model}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 space-y-1 pl-9">
                                                <p><span className="font-medium text-slate-600">Año:</span> {car.year}</p>
                                                {car.color_preference && <p><span className="font-medium text-slate-600">Color:</span> {car.color_preference}</p>}
                                            </div>
                                            {car.notes && (
                                                <div className="mt-3 ml-9 pt-2 border-t border-slate-100 text-xs text-slate-600 italic">
                                                    "{car.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <Car className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                                    <p className="text-slate-400 text-sm">No hay vehículos seleccionados.</p>
                                </div>
                            )}
                        </div>

                        {/* Sección 3: Datos Financieros */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                                Detalles Financieros
                            </label>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-xs font-medium text-slate-500">Presupuesto Estimado</span>
                                    <span className="text-xl font-mono font-bold text-slate-800">
                                        ${lead.budget?.toLocaleString() || '0.00'}
                                    </span>
                                </div>
                                {lead.financing && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        <span className="text-xs font-medium text-slate-700">
                                            Solicita Financiamiento
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA (Timeline Chat) --- */}
                    <div className="w-2/3 flex flex-col bg-white">

                        {/* Header del Timeline */}
                        <div className="px-6 py-3 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-10">
                            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-slate-400" />
                                Historial de Interacciones
                            </h3>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {interactions.length}
                            </span>
                        </div>

                        {/* Lista Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                            {interactions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <div className="bg-slate-100 p-4 rounded-full mb-3">
                                        <Clock className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-500">Sin historial reciente</p>
                                    <p className="text-sm opacity-75">Registra la primera interacción abajo.</p>
                                </div>
                            ) : (
                                interactions.map((interaction) => (
                                    <div key={interaction.id} className="flex gap-4 group">
                                        {/* Icono Vertical */}
                                        <div className="flex flex-col items-center pt-1">
                                            <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200 ring-4 ring-slate-50 z-10">
                                                {getInteractionIcon(interaction.type)}
                                            </div>
                                            <div className="w-0.5 h-full bg-slate-200 group-last:hidden -mb-6 mt-2"></div>
                                        </div>

                                        {/* Contenido */}
                                        <div className="flex-1 pb-2">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                                                    {interaction.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {interaction.created_at ? new Date(interaction.created_at).toLocaleString() : ''}
                                                </span>
                                            </div>

                                            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-tl-sm text-sm text-slate-700 shadow-sm leading-relaxed">
                                                {interaction.content}
                                            </div>

                                            <div className="mt-2 flex gap-2">
                                                {interaction.result && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${interaction.result === 'sin_respuesta'
                                                            ? 'bg-red-50 text-red-600 border-red-100'
                                                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        }`}>
                                                        {interaction.result.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area (Sticky Bottom) - DISEÑO MEJORADO */}
                        <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-20">
                            <form onSubmit={handleSubmitInteraction} className="flex flex-col gap-3">
                                {/* Selector de Tipo */}
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                                    {['llamada', 'whatsapp', 'visita', 'email', 'nota_interna'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setInteractionType(type)}
                                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all whitespace-nowrap active:scale-95 ${interactionType === type
                                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-800/20'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                } capitalize`}
                                        >
                                            {type.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>

                                {/* Campo de Texto y Botón Rediseñados */}
                                <div className="relative flex items-center gap-2">
                                    <Input
                                        placeholder={`Escribe el resultado de la ${interactionType.replace('_', ' ')}...`}
                                        value={newInteractionNote}
                                        onChange={(e) => setNewInteractionNote(e.target.value)}
                                        className="w-full rounded-full border border-slate-300 bg-slate-50 pl-5 pr-14 py-3 text-sm focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 shadow-inner transition-all"
                                        autoFocus
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || !newInteractionNote}
                                            className={`h-9 w-9 rounded-full shadow-sm transition-all ${!newInteractionNote
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                    : 'bg-brand-600 hover:bg-brand-700 text-white hover:scale-105 active:scale-95 shadow-brand-500/30'
                                                }`}
                                        >
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}