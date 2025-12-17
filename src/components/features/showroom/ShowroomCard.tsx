import { Clock, Car, CreditCard } from "lucide-react";
import { ShowroomVisit, getSourceLabel, getCreditLabel } from "./constants";

interface ShowroomCardProps {
    visit: ShowroomVisit;
}

export default function ShowroomCard({ visit }: ShowroomCardProps) {
    const sourceInfo = getSourceLabel(visit.source);
    const creditInfo = getCreditLabel(visit.credit_status);
    
    // Formato de fecha nativo (Sin date-fns)
    const visitDate = new Date(visit.visit_start);
    const visitTime = new Intl.DateTimeFormat('es-ES', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    }).format(visitDate);

    const duration = visit.visit_end 
        ? `${Math.round((new Date(visit.visit_end).getTime() - visitDate.getTime()) / 60000)} min`
        : 'En curso';

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
            {/* Header */}
            <div className="p-4 border-b border-slate-50 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-slate-900 text-lg truncate" title={visit.client_name}>
                        {visit.client_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${sourceInfo.color}`}>
                            {sourceInfo.label}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{visitTime} ({duration})</span>
                        </div>
                    </div>
                </div>
                {/* Avatar del vendedor (iniciales) */}
                {visit.profiles && (
                     <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200" title={visit.profiles.full_name}>
                        {visit.profiles.full_name.substring(0,2).toUpperCase()}
                     </div>
                )}
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
                        {/* Reemplazo de SteeringWheel por Car (icono seguro) */}
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