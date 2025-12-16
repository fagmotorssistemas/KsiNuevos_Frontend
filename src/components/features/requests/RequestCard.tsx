import { Calendar, User, CheckCircle2, XCircle, Trash2, DollarSign } from "lucide-react";
import { VehicleRequest, getPriorityColor, getStatusColor, RequestStatusType } from "./constants";

interface RequestCardProps {
    request: VehicleRequest;
    onStatusChange: (id: number, status: RequestStatusType) => void;
    onDelete: (id: number) => void;
}

export default function RequestCard({ request, onStatusChange, onDelete }: RequestCardProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
            {/* Header de la Tarjeta */}
            <div className="p-4 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg">{request.brand} {request.model}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${getPriorityColor(request.priority)}`}>
                            {request.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border font-medium capitalize ${getStatusColor(request.status)}`}>
                            {request.status}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-1">Presupuesto</span>
                    <span className="font-mono font-bold text-slate-700 text-lg">
                        {request.budget_max ? `$${request.budget_max.toLocaleString()}` : '-'}
                    </span>
                </div>
            </div>

            {/* Cuerpo de la Tarjeta */}
            <div className="p-4 space-y-3 flex-1">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{request.year_min || '?'} - {request.year_max || '?'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                        <div className="h-4 w-4 rounded-full border border-slate-200 bg-gradient-to-br from-gray-100 to-gray-300"></div>
                        <span className="capitalize">{request.color_preference || 'Cualquiera'}</span>
                    </div>
                </div>

                {request.client_name && (
                    <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 p-2 rounded-lg border border-brand-100">
                        <User className="h-4 w-4" />
                        <span className="font-medium truncate">Para: {request.client_name}</span>
                    </div>
                )}

                {request.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                        "{request.notes}"
                    </p>
                )}
            </div>

            {/* Acciones */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {request.status === 'pendiente' && (
                        <>
                            <button onClick={() => onStatusChange(request.id, 'aprobado')} title="Aprobar" className="p-2 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                                <CheckCircle2 className="h-5 w-5" />
                            </button>
                            <button onClick={() => onStatusChange(request.id, 'rechazado')} title="Rechazar" className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </>
                    )}
                    {request.status === 'aprobado' && (
                        <button onClick={() => onStatusChange(request.id, 'comprado')} title="Marcar como Comprado" className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-colors">
                            <CheckCircle2 className="h-4 w-4" /> Comprado
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                        Por: {request.profiles?.full_name?.split(' ')[0] || 'N/A'}
                    </span>
                    <button onClick={() => onDelete(request.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}