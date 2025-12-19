import {
    CheckCircle2,
    XCircle,
    MapPin,
    Car,
    AlertTriangle,
    User,
    Briefcase,
    CalendarClock // Nuevo icono para eventos generales
} from "lucide-react";
import type { AppointmentWithDetails } from "@/hooks/useAgenda";

interface AppointmentCardProps {
    appointment: AppointmentWithDetails;
    onComplete: (id: number) => void;
    onCancel: (id: number) => void;
    isAdminView?: boolean;
}

export function AppointmentCard({ appointment, onComplete, onCancel, isAdminView = false }: AppointmentCardProps) {
    // lead ahora puede ser null
    const { title, start_time, location, lead, status, responsible, external_client_name} = appointment;
    
    // Helpers de Fecha
    const dateObj = new Date(start_time);
    const timeStr = dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    
    // Lógica de Estado Visual
    const isPast = new Date() > dateObj;
    const isPending = status === 'pendiente' || status === 'confirmada' || status === 'reprogramada';
    const isOverdue = isPending && isPast;

    // Colores según estado
    let borderClass = "border-l-4 border-l-blue-500";
    let bgClass = "bg-white";
    let timeClass = "text-blue-600";

    // Si es una cita personal (sin lead), usamos un borde diferente (ej. morado) por defecto si está pendiente
    if (!lead && isPending) {
        borderClass = "border-l-4 border-l-purple-500";
        timeClass = "text-purple-600";
    }

    if (status === 'completada') {
        borderClass = "border-l-4 border-l-green-500 opacity-75";
        timeClass = "text-green-600";
    } else if (status === 'cancelada') {
        borderClass = "border-l-4 border-l-slate-300 opacity-60";
        timeClass = "text-slate-400";
    } else if (isOverdue) {
        borderClass = "border-l-4 border-l-red-500";
        bgClass = "bg-red-50/40"; 
        timeClass = "text-red-700 font-bold";
    }

    return (
        <div className={`relative flex items-start gap-4 p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md ${borderClass} ${bgClass}`}>
            
            {/* Columna Hora */}
            <div className="flex flex-col items-center min-w-[70px]">
                <span className={`text-xl font-bold ${timeClass}`}>
                    {timeStr}
                </span>
                {isOverdue && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1 animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        Atrasada
                    </span>
                )}
                {/* Indicador visual si es personal */}
                {!lead && !isOverdue && (
                    <span className="mt-1 text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        Personal
                    </span>
                )}
            </div>

            {/* Columna Info Principal */}
            <div className="flex-1 min-w-0">
                {/* HEADER: Si es Admin, mostramos el responsable */}
                {isAdminView && responsible && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded">
                        <Briefcase className="h-3 w-3" />
                        {responsible.full_name?.split(' ')[0] || 'Agente'}
                    </div>
                )}

                <h3 className={`text-base font-semibold ${status === 'completada' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                    {title}
                </h3>
                
                <div className="mt-1 space-y-1">
                    {/* LOGICA CONDICIONAL: ¿TIENE LEAD? */}
                    {lead ? (
                        <>
                            {/* Información del Lead */}
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium truncate">{lead.name}</span>
                                {lead.phone && (
                                    <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-xs text-slate-500">{lead.phone}</span>
                                        
                                    </>
                                )}
                            </div>

                            {/* Auto de Interés (Solo si hay lead) */}
                            {lead.interested_cars?.[0] && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Car className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="truncate">
                                        {lead.interested_cars[0].brand} {lead.interested_cars[0].model}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Si NO tiene lead (Cita personal/general) */
                        <div className="flex items-center gap-2 text-sm text-slate-500 italic">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                            <span>Evento general / Cita Personalizada</span>
                        </div>
                    )}

                    {/* Ubicación (Siempre visible) */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{location || 'Ubicación no especificada'}</span>
                    </div>
                </div>
            </div>

            {/* Columna Acciones */}
            {isPending && (
                <div className="flex flex-col gap-2 border-l border-slate-100 pl-4">
                    <button 
                        onClick={() => onComplete(appointment.id)}
                        className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-full transition-colors group shadow-sm"
                        title="Marcar como Completada"
                    >
                        <CheckCircle2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                        onClick={() => onCancel(appointment.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors group"
                        title="Cancelar Cita"
                    >
                        <XCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            )}

                                        {/* Mostrar external_client_name si existe */}
                            {external_client_name && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <User className="h-3 w-3 text-slate-400" />
                                    <span className="truncate">{external_client_name}</span>
                                </div>
                            )}

            {/* Badge de Estado para Historial */}
            {!isPending && (
                <div className="self-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                    {status}
                </div>
            )}
        </div>
    );
}