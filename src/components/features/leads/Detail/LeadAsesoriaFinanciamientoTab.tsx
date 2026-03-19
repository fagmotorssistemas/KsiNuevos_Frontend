import { useState } from "react";
import { Landmark, Save, WalletCards } from "lucide-react";
import { useLeadFinancialAdvisory } from "@/hooks/useLeadFinancialAdvisory";
import {
  FINANCIAL_ADVISORY_STATUS_CONFIG,
  type FinancialAdvisoryRow,
  type FinancialAdvisoryStatus,
} from "@/types/finance-advisory.types";

export function LeadAsesoriaFinanciamientoTab({ leadId }: { leadId: number }) {
  const { records, loading, updateRecord, updating } = useLeadFinancialAdvisory(leadId);

  if (loading) return <div className="p-8 text-center text-slate-400 text-xs">Cargando asesorias...</div>;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/30 custom-scrollbar p-6">
      <div className="mb-6 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Asesoria de Financiamiento</h3>
          <p className="text-xs text-slate-500">
            Gestiona dudas y respuestas sobre opciones de credito para el cliente.
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center p-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          <WalletCards className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay solicitudes de asesoria financiera para este lead.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <FinancialAdvisoryCard
              key={record.id}
              record={record}
              onSave={updateRecord}
              isUpdating={updating === record.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FinancialAdvisoryCard({
  record,
  onSave,
  isUpdating,
}: {
  record: FinancialAdvisoryRow;
  onSave: (id: number, status: FinancialAdvisoryStatus, note: string) => Promise<any>;
  isUpdating: boolean;
}) {
  const [status, setStatus] = useState<FinancialAdvisoryStatus>(record.estado);
  const [notes, setNotes] = useState(record.notas_vendedor || "");
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    await onSave(record.id, status, notes);
    setDirty(false);
  };

  const currentConfig = FINANCIAL_ADVISORY_STATUS_CONFIG[status];
  const Icon = currentConfig.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente consulta:</span>
            <p className="text-sm font-medium text-slate-800 mt-1 leading-snug">
              "{record.mensaje_completo || "Sin detalle de mensaje"}"
            </p>
            <span className="text-[10px] text-slate-400 mt-2 block">
              {record.fecha_solicitud
                ? `${new Date(record.fecha_solicitud).toLocaleDateString()} • ${new Date(
                    record.fecha_solicitud
                  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Sin fecha de solicitud"}
            </span>
          </div>
          <div className={`px-2 py-1 rounded-md border flex items-center gap-1.5 ${currentConfig.color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">{currentConfig.label}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white grid gap-4">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Estado de la asesoria</label>
          <div className="flex gap-2">
            {(Object.keys(FINANCIAL_ADVISORY_STATUS_CONFIG) as FinancialAdvisoryStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setDirty(true);
                }}
                className={`
                  px-3 py-1.5 rounded text-xs font-medium border transition-all
                  ${
                    status === s
                      ? FINANCIAL_ADVISORY_STATUS_CONFIG[s].color + " ring-1 ring-offset-1 ring-slate-200"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }
                `}
              >
                {FINANCIAL_ADVISORY_STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Notas de seguimiento</label>
          <textarea
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none bg-slate-50 placeholder:text-slate-400"
            rows={2}
            placeholder="Registra respuesta, condiciones del financiamiento o comentarios internos..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
          />
        </div>

        {dirty && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
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
