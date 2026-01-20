import { Clock, Car, CreditCard, Pencil } from "lucide-react";

// --- Definiciones Integradas ---

export interface ShowroomVisit {
    id: number;
    client_name: string;
    visit_start: string;
    visit_end: string | null;
    source: string;
    test_drive: boolean;
    credit_status: string;
    observation?: string;
    inventory?: {
        brand: string;
        model: string;
        year: number;
    };
    profiles?: {
        full_name: string;
    };
    [key: string]: any; 
}

export const getSourceLabel = (source: string) => {
    switch (source?.toLowerCase()) {
        case 'showroom':
            return { label: 'Showroom', color: 'bg-blue-100 text-blue-700' };
        case 'facebook':
            return { label: 'Facebook', color: 'bg-indigo-100 text-indigo-700' };
        case 'instagram':
            return { label: 'Instagram', color: 'bg-pink-100 text-pink-700' };
        case 'referido':
            return { label: 'Referido', color: 'bg-emerald-100 text-emerald-700' };
        default:
            return { label: source || 'Otro', color: 'bg-slate-100 text-slate-600' };
    }
};

export const getCreditLabel = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'aplica':
            return { label: 'Aplica', color: 'bg-green-50 border-green-100 text-green-700' };
        case 'rechazado':
            return { label: 'Rechazado', color: 'bg-red-50 border-red-100 text-red-700' };
        case 'pendiente':
            return { label: 'Pendiente', color: 'bg-amber-50 border-amber-100 text-amber-700' };
        default:
            return { label: 'Sin Datos', color: 'bg-slate-50 border-slate-100 text-slate-400' };
    }
};

// --- Componente Principal ---

interface ShowroomCardProps {
    visit: ShowroomVisit;
    onEdit?: (visit: ShowroomVisit) => void;
}

export default function ShowroomCard({ visit, onEdit }: ShowroomCardProps) {
    const sourceInfo = getSourceLabel(visit.source);
    const creditInfo = getCreditLabel(visit.credit_status);

    // 1. Convertimos las fechas string a objetos Date
    // Al venir en formato ISO Z (ej: ...22:10Z), 'new Date' entiende que es UTC.
    const startDate = new Date(visit.visit_start);
    const endDate = visit.visit_end ? new Date(visit.visit_end) : null;

    // 2. Configuración para mostrar la hora
    // IMPORTANTE: Quitamos 'timeZone: UTC'.
    // Al quitarlo, Intl usa la zona horaria de TU navegador (Ecuador).
    // Automáticamente convierte las 22:10 UTC (BD) -> 17:10 Local (Pantalla).
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
        // timeZone: 'UTC' <--- ELIMINADO PARA QUE HAGA LA CONVERSIÓN AUTOMÁTICA
    };

    const startTimeStr = new Intl.DateTimeFormat('es-ES', timeOptions).format(startDate);
    
    const endTimeStr = endDate 
        ? new Intl.DateTimeFormat('es-ES', timeOptions).format(endDate) 
        : '...';

    // 3. Calculamos la duración simple en minutos
    const duration = endDate
        ? `${Math.round((endDate.getTime() - startDate.getTime()) / 60000)} min`
        : 'En curso';

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full group relative max-w-md mx-auto w-full">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-50 flex justify-between items-start">
                <div className="max-w-[80%]">
                    <h3 className="font-bold text-slate-900 text-lg truncate" title={visit.client_name}>
                        {visit.client_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${sourceInfo.color}`}>
                            {sourceInfo.label}
                        </span>
                        
                        {/* Hora Inicio - Hora Fin (Duración) */}
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>
                                {startTimeStr} - {endTimeStr} ({duration})
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                    {onEdit && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(visit);
                            }}
                            className="h-8 w-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                            title="Editar Visita"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    )}

                    {visit.profiles && (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200" title={visit.profiles.full_name}>
                            {visit.profiles.full_name.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 space-y-4">
                {/* Auto de Interés */}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <Car className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-medium uppercase">Vehículo de Interés</p>
                        {visit.inventory ? (
                            <p className="text-sm font-semibold text-slate-800">
                                {visit.inventory.brand} {visit.inventory.model} <span className="text-slate-400 font-normal">'{visit.inventory.year}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No especificado / General</p>
                        )}
                    </div>
                </div>

                {/* Detalles (Test Drive & Crédito) */}
                <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium ${visit.test_drive ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        <Car className="h-4 w-4" />
                        <span>{visit.test_drive ? 'Test Drive Realizado' : 'Sin Test Drive'}</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium ${creditInfo.color}`}>
                        <CreditCard className="h-4 w-4" />
                        <span>{creditInfo.label}</span>
                    </div>
                </div>

                {/* Observación */}
                {visit.observation && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                        "{visit.observation}"
                    </div>
                )}
            </div>
        </div>
    );
}