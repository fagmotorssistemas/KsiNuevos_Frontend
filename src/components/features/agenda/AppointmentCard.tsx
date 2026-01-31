import {
    CheckCircle2,
    XCircle,
    MapPin,
    Car,
    AlertTriangle,
    User,
    Briefcase,
    CalendarClock,
    Edit3
} from "lucide-react";
import type { AppointmentWithDetails } from "@/hooks/useAgenda";

interface AppointmentCardProps {
    appointment: AppointmentWithDetails;
    onComplete: (id: number) => void;
    onCancel: (id: number) => void;
    onEdit?: (appointment: AppointmentWithDetails) => void;
    isAdminView?: boolean;
}

export function AppointmentCard({ appointment, onComplete, onCancel, onEdit, isAdminView = false }: AppointmentCardProps) {
    const { title, start_time, location, lead, status, responsible, external_client_name} = appointment;
    
    const dateObj = new Date(start_time);
    const timeStr = dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    
    const isPast = new Date() > dateObj;
    const isPending = status === 'pendiente' || status === 'confirmada' || status === 'reprogramada';
    const isOverdue = isPending && isPast;

    // Acentos de estado ultra-sutiles
    let accentColor = "bg-blue-600";
    if (!lead && isPending) accentColor = "bg-purple-600";
    if (status === 'completada') accentColor = "bg-emerald-500";
    if (status === 'cancelada') accentColor = "bg-slate-300";
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

                <h3 className={`text-[15px] font-bold leading-tight mb-2 truncate ${status === 'completada' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
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
                            <span>Evento general / Personal</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{location || 'Ubicación no especificada'}</span>
                    </div>
                </div>
            </div>

            {/* 4. Columna de Acciones Ghost Vertical */}
            {isPending ? (
                <div className="flex flex-col justify-center gap-1 px-2 border-l border-slate-50 bg-slate-50/30">
                    <button 
                        onClick={() => onComplete(appointment.id)}
                        className="p-2.5 text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
                        title="Completar"
                    >
                        <CheckCircle2 className="h-5 w-5" />
                    </button>
                    
                    {onEdit && (
                        <button 
                            onClick={() => onEdit(appointment)}
                            className="p-2.5 text-slate-700 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all duration-200"
                            title="Editar"
                        >
                            <Edit3 className="h-5 w-5" />
                        </button>
                    )}

                    <button 
                        onClick={() => onCancel(appointment.id)}
                        className="p-2.5 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Cancelar"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center px-6 bg-slate-50/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {status}
                    </span>
                </div>
            )}
        </div>
    );
}