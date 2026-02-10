import { CheckCircle2, Clock, Bot, Quote } from "lucide-react";
import { useLeadRecovery } from "@/hooks/useLeadRecovery"; // Asegúrate de usar tu hook corregido
import { RECOVERY_STEPS, RESPONSE_CONFIG, LeadMessageResponse } from "@/types/recovery.types";
import type { LeadWithDetails } from "@/types/leads.types";

export function LeadRecoveryTab({ lead }: { lead: LeadWithDetails }) {
  // El hook ya trae las nuevas columnas gracias al select('*')
  const { recoveryData, loading } = useLeadRecovery(lead.id);

  if (loading) return <div className="p-8 text-center text-slate-400 text-xs">Cargando monitor...</div>;

  // Renderizado del contenido de la tarjeta
  const renderCardContent = (isSent: boolean, response: LeadMessageResponse, responseText: string | null) => {
    
    // 1. Aún no enviado
    if (!isSent) {
      return (
        <div className="flex items-center gap-2 text-slate-400 italic mt-1">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">Programado para envío automático</span>
        </div>
      );
    }

    // 2. Enviado pero sin respuesta (ni enum ni texto)
    if (isSent && !response) {
      return (
        <div className="flex items-center gap-2 text-brand-600 bg-brand-50 p-2.5 rounded-md border border-brand-100 animate-pulse mt-1">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-semibold">Esperando respuesta...</span>
        </div>
      );
    }

    // 3. Hay respuesta (Enum y/o Texto)
    const config = response ? RESPONSE_CONFIG[response] : null;
    
    return (
      <div className="mt-2 space-y-2">
        {/* A. La Categoría (Badge de color) */}
        {config && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border w-fit ${config.bg}`}>
                <config.icon className={`w-3.5 h-3.5 ${response === 'no_le_interesa' ? 'rotate-180' : ''} ${config.text}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wide ${config.text}`}>{config.label}</span>
            </div>
        )}

        {/* B. El Texto Real del Cliente (Burbuja de chat) */}
        {responseText && (
            <div className="relative group">
                <div className="absolute top-3 left-3">
                    <Quote className="w-3 h-3 text-slate-400 opacity-50" />
                </div>
                <div className="pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700 italic leading-relaxed">
                    "{responseText}"
                </div>
                <div className="text-[10px] text-slate-400 text-right mt-1 mr-1">Mensaje original</div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/30 custom-scrollbar p-6">
      
      {/* Header */}
      <div className="mb-8 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="bg-brand-50 p-2.5 rounded-lg text-brand-600">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Monitor de Respuestas</h3>
          <p className="text-xs text-slate-500">Visualiza la categoría y el mensaje exacto del cliente.</p>
        </div>
      </div>

      {!recoveryData ? (
        <div className="text-center p-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>La automatización iniciará pronto.</p>
        </div>
      ) : (
        /* Timeline */
        <div className="relative pl-4 space-y-8">
          <div className="absolute left-[19px] top-3 bottom-6 w-0.5 bg-slate-200 -z-10" />

          {RECOVERY_STEPS.map((step) => {
            // Acceso Dinámico a las propiedades
            const isSent = recoveryData[`sent_${step.key}` as keyof typeof recoveryData] as boolean;
            const response = recoveryData[`response_${step.key}` as keyof typeof recoveryData] as LeadMessageResponse;
            const responseText = recoveryData[`response_${step.key}_text` as keyof typeof recoveryData] as string | null;

            return (
              <div key={step.key} className={`relative flex gap-4 ${!isSent ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                
                {/* Timeline Icon */}
                <div className={`
                  flex-shrink-0 w-4 h-4 rounded-full border-2 box-content flex items-center justify-center bg-white z-10 mt-4
                  ${isSent ? 'border-brand-500 text-brand-500 shadow-sm' : 'border-slate-300 text-slate-300'}
                `}>
                  {isSent && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </div>

                {/* Card */}
                <div className={`flex-1 bg-white border rounded-xl overflow-hidden transition-all ${isSent ? 'border-slate-300 shadow-sm' : 'border-slate-200'}`}>
                  {/* Card Header */}
                  <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">{step.title} ({step.label})</span>
                    {isSent && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 bg-slate-50/20">
                    {renderCardContent(isSent, response, responseText)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}