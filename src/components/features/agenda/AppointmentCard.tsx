import {
    CheckCircle2,
    XCircle,
    MapPin,
    Car,
    User,
    Briefcase,
    CalendarClock,
    Edit3,
    Phone,
    MessageSquare
} from "lucide-react";
import { isAppointmentPendingActive, type AppointmentWithDetails } from "@/hooks/useAgenda";

interface AppointmentCardProps {
    appointment: AppointmentWithDetails;
    onComplete: (id: number) => void;
    onNoShow: (appointment: AppointmentWithDetails) => void;
    onEdit?: (appointment: AppointmentWithDetails) => void;
    isAdminView?: boolean;
}

function followUpLabel(value: string | null | undefined) {
    if (value === "llamada") return "Se llamó para saber el porqué";
    if (value === "mensaje") return "Se dejó un mensaje";
    return null;
}

function outcomeLabel(appointment: AppointmentWithDetails) {
    if (appointment.client_attended === true || appointment.status === "completada") return "Vino";
    if (appointment.client_attended === false || appointment.status === "no_asistio") return "No vino";
    return appointment.status;
}

export function AppointmentCard({ appointment, onComplete, onNoShow, onEdit, isAdminView = false }: AppointmentCardProps) {
    const { title, start_time, location, lead, status, responsible, external_client_name } = appointment;
    
    const dateObj = new Date(start_time);
    const timeStr = dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    
    const isPast = new Date() > dateObj;
    const isPending = isAppointmentPendingActive(appointment);
    const isOverdue = isPending && isPast;
    const didAttend = appointment.client_attended === true || (appointment.client_attended == null && status === "completada");
    const didNotAttend = appointment.client_attended === false || status === "no_asistio";
    const followUp = followUpLabel(appointment.no_show_follow_up);

    // Acentos de estado ultra-sutiles
    let accentColor = "bg-blue-600";
    if (!lead && isPending) accentColor = "bg-purple-600";
    if (didAttend) accentColor = "bg-emerald-500";
    if (status === 'cancelada') accentColor = "bg-slate-300";
    if (didNotAttend) accentColor = "bg-orange-500";
    if (isOverdue) accentColor = "bg-red-500";

    return (
        <div className={`group relative flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${status === 'cancelada' ? 'opacity-60' : ''}`}>
            
            {/* 1. Indicador de Estado Lateral */}
            <div className={`w-1 ${accentColor}`} />

            {/* 2. Sección de Hora (Sidebar Limpio) */}
            <div className="flex flex-col items-center justify-center py-4 px-4 border-r border-slate-100 min-w-[90px] bg-slate-50/20">
                <span className={`text-lg font-black tracking-tight ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                    {timeStr}
                </span>
                {isOverdue && (
                    <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-red-500 flex items-center gap-0.5">
                         Atrasada
                    </span>
                )}
                {!lead && !isOverdue && (
                    <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-purple-500">
                        Personal
                    </span>
                )}
            </div>

            {/* 3. Información Central (Jerarquía Optimizada) */}
            <div className="flex-1 p-4 min-w-0 flex flex-col justify-center">
                {isAdminView && responsible && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {responsible.full_name?.split(' ')[0]}
                        </span>
                    </div>
                )}

                <h3 className={`text-[15px] font-bold leading-tight mb-2 truncate ${didAttend ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {title}
                </h3>
                
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {lead ? (
                        <>
                            <div className="flex items-center gap-2 text-[13px] text-slate-600">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="font-semibold">{lead.name}</span>
                                {lead.phone && <span className="text-slate-400 font-normal">({lead.phone})</span>}
                            </div>
                            {lead.interested_cars?.[0] && (
                                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                                    <Car className="h-4 w-4 text-slate-400" />
                                    <span className="truncate">{lead.interested_cars[0].brand} {lead.interested_cars[0].model}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-[12px] text-slate-400 italic">
                            <CalendarClock className="h-4 w-4 text-slate-300" />
                            <span>{external_client_name || 'Evento general / Personal'}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{location || 'Ubicación no especificada'}</span>
                    </div>
                </div>

                {!isPending && didNotAttend && (appointment.no_show_reason || followUp) && (
                    <div className="mt-2.5 space-y-1">
                        {appointment.no_show_reason && (
                            <p className="text-[12px] text-slate-600">
                                <span className="font-semibold text-slate-500">Motivo:</span> {appointment.no_show_reason}
                            </p>
                        )}
                        {followUp && (
                            <p className="text-[12px] text-slate-500 flex items-center gap-1.5">
                                {appointment.no_show_follow_up === "llamada" ? (
                                    <Phone className="h-3.5 w-3.5" />
                                ) : (
                                    <MessageSquare className="h-3.5 w-3.5" />
                                )}
                                {followUp}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* 4. Columna de Acciones Ghost Vertical */}
            {isPending ? (
                <div className="flex flex-col justify-center gap-1 px-1.5 py-2 border-l border-slate-50 bg-slate-50/30 min-w-[64px]">
                    <button 
                        onClick={() => onComplete(appointment.id)}
                        className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
                        title="Si vino"
                    >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-[9px] font-bold leading-tight whitespace-nowrap">Si vino</span>
                    </button>
                    
                    {onEdit && (
                        <button 
                            onClick={() => onEdit(appointment)}
                            className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 text-slate-700 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all duration-200"
                            title="Editar"
                        >
                            <Edit3 className="h-5 w-5" />
                            <span className="text-[9px] font-bold leading-tight whitespace-nowrap">Editar</span>
                        </button>
                    )}

                    <button 
                        onClick={() => onNoShow(appointment)}
                        className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="No vino"
                    >
                        <XCircle className="h-5 w-5" />
                        <span className="text-[9px] font-bold leading-tight whitespace-nowrap">No vino</span>
                    </button>
                </div>
            ) : (
                <div className="flex items-center px-6 bg-slate-50/10">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        didAttend ? 'text-emerald-600' : didNotAttend ? 'text-orange-600' : 'text-slate-400'
                    }`}>
                        {outcomeLabel(appointment)}
                    </span>
                </div>
            )}
        </div>
    );
}
