// src/components/LeadDatosPedidosTab.tsx
import { useState } from 'react';
import { FileQuestion, Save, MessageSquareText } from "lucide-react";
import { useLeadRequests } from '@/hooks/useLeadRequests';
import { REQUEST_STATUS_CONFIG, RequestStatus, ClientRequestRow } from '@/types/requests.types';

export function LeadDatosPedidosTab({ leadId }: { leadId: number }) {
  const { requests, loading, updateRequest, updating } = useLeadRequests(leadId);

  if (loading) return <div className="p-8 text-center text-slate-400 text-xs">Cargando solicitudes...</div>;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/30 custom-scrollbar p-6">
      
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="bg-purple-50 p-2.5 rounded-lg text-purple-600">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Solicitudes del Cliente</h3>
          <p className="text-xs text-slate-500">Gestiona preguntas específicas o datos pedidos por el cliente.</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center p-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          <MessageSquareText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay solicitudes registradas para este lead.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <RequestCard 
              key={req.id} 
              request={req} 
              onSave={updateRequest} 
              isUpdating={updating === req.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-componente para cada tarjeta (Para manejar el estado local de los inputs antes de guardar)
function RequestCard({ 
  request, 
  onSave, 
  isUpdating 
}: { 
  request: ClientRequestRow; 
  onSave: (id: number, status: RequestStatus, note: string) => Promise<any>;
  isUpdating: boolean;
}) {
  const [status, setStatus] = useState<RequestStatus>(request.estado);
  const [notes, setNotes] = useState(request.notas_vendedor || '');
  const [dirty, setDirty] = useState(false); // Para saber si hay cambios sin guardar

  const handleSave = async () => {
    await onSave(request.id, status, notes);
    setDirty(false);
  };

  const currentConfig = REQUEST_STATUS_CONFIG[status];
  const Icon = currentConfig.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      
      {/* 1. Header de la Tarjeta: La Pregunta del Cliente */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start gap-4">
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente solicita:</span>
                <p className="text-sm font-medium text-slate-800 mt-1 leading-snug">
                "{request.mensaje_completo}"
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block">
                    {new Date(request.fecha_solicitud).toLocaleDateString()} • {new Date(request.fecha_solicitud).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
            {/* Badge de estado actual visual */}
            <div className={`px-2 py-1 rounded-md border flex items-center gap-1.5 ${currentConfig.color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">{currentConfig.label}</span>
            </div>
        </div>
      </div>

      {/* 2. Cuerpo: Controles del Vendedor */}
      <div className="p-4 bg-white grid gap-4">
        
        {/* Selector de Estado */}
        <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Estado de la solicitud</label>
            <div className="flex gap-2">
                {(Object.keys(REQUEST_STATUS_CONFIG) as RequestStatus[]).map((s) => (
                    <button
                        key={s}
                        onClick={() => { setStatus(s); setDirty(true); }}
                        className={`
                            px-3 py-1.5 rounded text-xs font-medium border transition-all
                            ${status === s 
                                ? REQUEST_STATUS_CONFIG[s].color + ' ring-1 ring-offset-1 ring-slate-200' 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}
                        `}
                    >
                        {REQUEST_STATUS_CONFIG[s].label}
                    </button>
                ))}
            </div>
        </div>

        {/* Text Area de Notas */}
        <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Notas de resolución / Comentarios</label>
            <textarea
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none bg-slate-50 placeholder:text-slate-400"
                rows={2}
                placeholder="Escribe aquí la respuesta dada o notas internas..."
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
            />
        </div>

        {/* Botón de Guardar (Solo aparece si hay cambios 'dirty') */}
        {dirty && (
            <div className="flex justify-end pt-1">
                <button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                    {isUpdating ? (
                        <>Guardando...</>
                    ) : (
                        <>
                            <Save className="w-3.5 h-3.5" />
                            Guardar Cambios
                        </>
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}