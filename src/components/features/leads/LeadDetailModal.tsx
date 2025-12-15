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
    Loader2,
    ExternalLink,
    Calendar,
    MapPin,
    AlertTriangle
} from "lucide-react";

// Hooks y Tipos
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/supabase";
import type { LeadWithDetails } from "../../../hooks/useLeads";

// --- COMPONENTES UI LOCALES ---

// Corregido: Input recibe props correctamente
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`flex w-full outline-none transition-all duration-200 ${className}`}
        {...props}
    />
);

// Corregido: TextArea recibe props correctamente
const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        className={`flex w-full outline-none transition-all duration-200 ${className}`}
        {...props}
    />
);

// ¡CORRECCIÓN CRÍTICA AQUÍ!: 
// Antes 'children' se extraía pero no se usaba. Ahora se renderiza dentro del button.
const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        className={`inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${className}`}
        {...props}
    >
        {children}
    </button>
);

// --- TIPOS ---
type Interaction = Database['public']['Tables']['interactions']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

interface LeadDetailModalProps {
    lead: LeadWithDetails;
    onClose: () => void;
}

// --- CONFIGURACIÓN DE ESTADOS (ENUM SQL) ---
const STATUS_OPTIONS = [
    { value: 'nuevo', label: 'Nuevo', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'contactado', label: 'Contactado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'interesado', label: 'Interesado', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'negociando', label: 'Negociando', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'ganado', label: 'Ganado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'perdido', label: 'Perdido', color: 'bg-red-50 text-red-700 border-red-200' }
];

// Opciones de resultado según el tipo de interacción
const RESULT_OPTIONS: Record<string, string[]> = {
    llamada: ['contestó', 'buzón', 'ocupado', 'número_equivocado', 'volver_a_llamar'],
    whatsapp: ['enviado', 'leído', 'respondido', 'bloqueado'],
    visita: ['asistió', 'no_asistió', 'reprogramó', 'venta_cerrada'],
    email: ['enviado', 'rebotado', 'respondido'],
    nota_interna: ['informativo', 'urgente']
};

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
    const { supabase, user } = useAuth();

    // --- ESTADOS GLOBALES ---
    const [activeTab, setActiveTab] = useState<'history' | 'agenda'>('history');

    // --- ESTADOS DEL LEAD (STATUS) ---
    const [currentStatus, setCurrentStatus] = useState<string>(lead.status || 'nuevo');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // --- ESTADOS RESUMEN ---
    const [resume, setResume] = useState(lead.resume || "");
    const [isSavingResume, setIsSavingResume] = useState(false);

    // --- ESTADOS INTERACCIONES ---
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [newInteractionNote, setNewInteractionNote] = useState("");
    const [interactionType, setInteractionType] = useState<string>("llamada");
    const [interactionResult, setInteractionResult] = useState<string | null>(null);
    const [isSubmittingInteraction, setIsSubmittingInteraction] = useState(false);

    // --- ESTADOS AGENDA ---
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [apptDate, setApptDate] = useState("");
    const [apptTime, setApptTime] = useState("");
    const [apptTitle, setApptTitle] = useState("");
    const [isSubmittingAppt, setIsSubmittingAppt] = useState(false);

    // --- EFECTOS DE CARGA ---
    useEffect(() => {
        // 1. Cargar Interacciones
        const fetchInteractions = async () => {
            const { data } = await supabase
                .from('interactions')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });
            if (data) setInteractions(data);
        };

        // 2. Cargar Citas
        const fetchAppointments = async () => {
            const { data } = await supabase
                .from('appointments')
                .select('*')
                .eq('lead_id', lead.id)
                .order('start_time', { ascending: true }); // Las más próximas primero
            if (data) setAppointments(data);
        };

        fetchInteractions();
        fetchAppointments();
    }, [lead.id, supabase]);

    // --- LOGICA CAMBIO DE ESTADO ---
    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === currentStatus) return;
        setIsUpdatingStatus(true);

        const { error } = await supabase
            .from('leads')
            // Corregido: Usamos 'as any' para evitar el error de tipado estricto de TS con el ENUM
            .update({ status: newStatus as any })
            .eq('id', lead.id);

        if (!error) {
            setCurrentStatus(newStatus);
        } else {
            console.error("Error actualizando estado:", error);
            alert("No se pudo actualizar el estado. Inténtalo de nuevo.");
        }
        setIsUpdatingStatus(false);
    };

    // --- LOGICA RESUMEN ---
    const handleSaveResume = async () => {
        if (resume === lead.resume) return;
        setIsSavingResume(true);
        await supabase.from('leads').update({ resume }).eq('id', lead.id);
        setIsSavingResume(false);
    };

    // --- LOGICA KOMMO ---
    const handleOpenKommo = () => {
        if (!lead.lead_id_kommo) {
            alert("Este lead no tiene ID de Kommo asociado.");
            return;
        }
        // URL Estándar de Kommo para detalle de leads
        const url = `https://marketingfagmotorsurfacom.kommo.com/leads/detail/${lead.lead_id_kommo}`;
        window.open(url, '_blank');
    };

    // --- LOGICA INTERACCIONES ---
    const handleSubmitInteraction = async (e: FormEvent) => {
        e.preventDefault();
        if ((!newInteractionNote.trim() && !interactionResult) || !user) return;

        setIsSubmittingInteraction(true);

        const { data, error } = await supabase
            .from('interactions')
            .insert({
                lead_id: lead.id,
                type: interactionType as any,
                content: newInteractionNote,
                result: interactionResult || 'completado', // Usamos el chip seleccionado
                responsible_id: user.id
            })
            .select()
            .single();

        if (!error && data) {
            setInteractions([data, ...interactions]);
            setNewInteractionNote("");
            setInteractionResult(null); // Resetear chip
        }
        setIsSubmittingInteraction(false);
    };

    // --- LOGICA AGENDA ---
    const handleSubmitAppointment = async (e: FormEvent) => {
        e.preventDefault();
        if (!apptDate || !apptTime || !apptTitle || !user) return;

        setIsSubmittingAppt(true);

        // Construir Timestamp (Fecha + Hora)
        const startDateTime = new Date(`${apptDate}T${apptTime}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 Hora fija

        const { data, error } = await supabase
            .from('appointments')
            .insert({
                lead_id: lead.id,
                responsible_id: user.id,
                title: apptTitle,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                status: 'pendiente',
                location: 'Showroom' // Default por ahora
            })
            .select()
            .single();

        if (!error && data) {
            setAppointments([...appointments, data].sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            ));
            // Limpiar form
            setApptTitle("");
            setApptTime("");
        } else {
            console.error(error);
            alert("Error al agendar. Verifica los datos.");
        }
        setIsSubmittingAppt(false);
    };

    // Helpers UI
    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'llamada': return <Phone className="h-4 w-4 text-blue-500" />;
            case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-500" />;
            case 'visita': return <User className="h-4 w-4 text-purple-500" />;
            default: return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    // Formatear fecha para mostrar en lista de agenda
    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('es-EC', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">

                {/* --- HEADER --- */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="min-w-0 pr-4"> {/* Agregado min-w-0 para evitar empujar demasiado */}
                        <h2 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500 font-medium whitespace-nowrap">{lead.phone || 'Sin teléfono'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-sm text-slate-500 capitalize">{lead.source}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-nowrap"> {/* Agregado flex-nowrap */}

                        {/* SELECTOR DE ESTADO (Integrado) */}
                        <div className="relative group shrink-0">
                            <select
                                disabled={isUpdatingStatus}
                                value={currentStatus}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className={`
                                    appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer outline-none border transition-all
                                    ${STATUS_OPTIONS.find(o => o.value === currentStatus)?.color || 'bg-gray-100'}
                                    ${isUpdatingStatus ? 'opacity-50 cursor-wait' : 'hover:brightness-95'}
                                `}
                            >
                                {STATUS_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} className="bg-white text-slate-700">
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {/* Icono estado/carga */}
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60">
                                {isUpdatingStatus ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                )}
                            </div>
                        </div>

                        {/* BOTÓN KOMMO CORREGIDO Y BLINDADO */}
                        <Button
                            onClick={handleOpenKommo}
                            // Clases clave añadidas:
                            // 1. shrink-0: Nunca encogerse.
                            // 2. whitespace-nowrap: Texto en una línea.
                            // 3. px-4: Padding horizontal adecuado.
                            className="bg-[#2c86fe]/10 text-[#2c86fe] hover:bg-[#2c86fe]/20 px-4 py-2 rounded-full text-xs font-bold gap-2 transition-colors whitespace-nowrap shrink-0"
                            title="Abrir en Kommo CRM"
                        >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="shrink-0">Abrir en Kommo</span>
                        </Button>

                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 shrink-0">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* --- COLUMNA IZQUIERDA (Info Estática & Resumen) --- */}
                    <div className="w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto custom-scrollbar">
                        {/* (Mismo contenido de Resumen y Vehículos que tenías antes) */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Edit3 className="h-3 w-3" /> Resumen Ejecutivo
                                </label>
                                <div className="flex items-center gap-1.5 h-4">
                                    {isSavingResume ? (
                                        <><Loader2 className="h-3 w-3 animate-spin text-brand-600" /><span className="text-[10px] text-brand-600 font-medium">Guardando...</span></>
                                    ) : (
                                        <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-slate-400 font-medium">Guardado</span></>
                                    )}
                                </div>
                            </div>
                            <TextArea
                                value={resume || ''}
                                onChange={(e) => setResume(e.target.value)}
                                onBlur={handleSaveResume}
                                placeholder="Estatus actual del cliente..."
                                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm min-h-[140px] resize-none leading-relaxed"
                            />
                        </div>

                        {/* Vehículos (Simplificado para el ejemplo) */}
                        <div className="mb-8">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Vehículos de Interés</label>
                            {lead.interested_cars && lead.interested_cars.length > 0 ? (
                                <div className="space-y-3">
                                    {lead.interested_cars.map((car) => (
                                        <div key={car.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Car className="h-4 w-4 text-brand-600" />
                                                <span className="font-semibold text-slate-800">{car.brand} {car.model}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 pl-6">{car.year} • {car.color_preference}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No hay vehículos seleccionados.</p>
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

                    {/* --- COLUMNA DERECHA (Tabs: Historial / Agenda) --- */}
                    <div className="w-2/3 flex flex-col bg-white">

                        {/* Selector de Pestañas */}
                        <div className="flex border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                                    ? 'border-slate-800 text-slate-800'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <MessageCircle className="h-4 w-4" /> Historial
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('agenda')}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'agenda'
                                    ? 'border-slate-800 text-slate-800'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Calendar className="h-4 w-4" /> Agenda
                                </div>
                            </button>
                        </div>

                        {/* --- CONTENIDO PESTAÑA HISTORIAL --- */}
                        {activeTab === 'history' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                                    {interactions.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <Clock className="h-8 w-8 mb-2 opacity-50" />
                                            <p className="text-sm">Sin interacciones.</p>
                                        </div>
                                    ) : (
                                        interactions.map((interaction) => (
                                            <div key={interaction.id} className="flex gap-4">
                                                <div className="flex flex-col items-center pt-1">
                                                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200 z-10">
                                                        {getInteractionIcon(interaction.type)}
                                                    </div>
                                                    <div className="w-0.5 h-full bg-slate-200 -mb-6 mt-2"></div>
                                                </div>
                                                <div className="flex-1 pb-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs font-bold uppercase text-slate-600">{interaction.type}</span>
                                                        <span className="text-[10px] text-slate-400">{new Date(interaction.created_at || '').toLocaleString()}</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-700 shadow-sm">
                                                        {interaction.content}
                                                    </div>
                                                    {interaction.result && (
                                                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium uppercase tracking-wide">
                                                            {interaction.result.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Input Area Mejorado con Chips */}
                                <div className="p-4 bg-white border-t border-slate-200 shadow-up z-20">
                                    <form onSubmit={handleSubmitInteraction} className="flex flex-col gap-3">
                                        {/* Selector Tipo */}
                                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                            {Object.keys(RESULT_OPTIONS).map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => { setInteractionType(type); setInteractionResult(null); }}
                                                    className={`text-xs px-3 py-1.5 rounded-full border font-medium capitalize transition-all ${interactionType === type ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                                                        }`}
                                                >
                                                    {type.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Selector de Resultado (CHIPS) */}
                                        <div className="flex flex-wrap gap-2">
                                            {RESULT_OPTIONS[interactionType]?.map(option => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => setInteractionResult(option)}
                                                    className={`text-[10px] px-2.5 py-1 rounded-md border uppercase tracking-wide font-semibold transition-all ${interactionResult === option
                                                        ? 'bg-brand-50 border-brand-200 text-brand-700 ring-1 ring-brand-200'
                                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {option.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Input y Botón */}
                                        <div className="relative flex items-center gap-2">
                                            <Input
                                                placeholder={`Resultado de la ${interactionType}...`}
                                                value={newInteractionNote}
                                                onChange={(e) => setNewInteractionNote(e.target.value)}
                                                className="w-full rounded-full border border-slate-300 bg-slate-50 pl-5 pr-14 py-3 text-sm focus:border-brand-500 focus:bg-white shadow-inner"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmittingInteraction}
                                                    className="h-9 w-9 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                                                >
                                                    {isSubmittingInteraction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}

                        {/* --- CONTENIDO PESTAÑA AGENDA --- */}
                        {activeTab === 'agenda' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                                    {appointments.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <Calendar className="h-10 w-10 mb-2 opacity-50" />
                                            <p className="text-sm font-medium">Agenda vacía</p>
                                            <p className="text-xs">Programa una cita abajo.</p>
                                        </div>
                                    ) : (
                                        appointments.map(appt => (
                                            <div key={appt.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-brand-200 transition-colors">
                                                <div className="bg-brand-50 text-brand-700 p-2.5 rounded-lg flex flex-col items-center min-w-[60px]">
                                                    <span className="text-xs font-bold uppercase">{new Date(appt.start_time).toLocaleString('es-EC', { month: 'short' })}</span>
                                                    <span className="text-xl font-bold">{new Date(appt.start_time).getDate()}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-800">{appt.title}</h4>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {appt.location || 'Showroom'}</span>
                                                    </div>
                                                </div>
                                                <div className="self-center">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider ${appt.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                                        appt.status === 'completada' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {appt.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Formulario de Agendamiento */}
                                <div className="p-5 bg-white border-t border-slate-200 shadow-up z-20">
                                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-2">
                                        <Calendar className="h-3 w-3" /> Nueva Cita
                                    </h4>
                                    <form onSubmit={handleSubmitAppointment} className="space-y-3">
                                        <Input
                                            placeholder="Título (Ej: Visita Showroom)"
                                            value={apptTitle}
                                            onChange={(e) => setApptTitle(e.target.value)}
                                            className="bg-slate-50 border-slate-200 focus:bg-white"
                                        />
                                        <div className="flex gap-3">
                                            <Input
                                                type="date"
                                                value={apptDate}
                                                onChange={(e) => setApptDate(e.target.value)}
                                                className="bg-slate-50 border-slate-200 focus:bg-white"
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                            <Input
                                                type="time"
                                                value={apptTime}
                                                onChange={(e) => setApptTime(e.target.value)}
                                                className="bg-slate-50 border-slate-200 focus:bg-white"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isSubmittingAppt || !apptTitle || !apptDate || !apptTime}
                                            className="w-full bg-slate-800 hover:bg-slate-900 text-white h-10 rounded-lg shadow-sm mt-1"
                                        >
                                            {isSubmittingAppt ? "Agendando..." : "Agendar Cita"}
                                        </Button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}