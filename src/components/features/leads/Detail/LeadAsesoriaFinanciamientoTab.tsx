import { useEffect, useMemo, useState } from "react";
import { FileImage, FileText, Landmark, PhoneCall, Plus, Save, Send, UserRound, WalletCards } from "lucide-react";
import { useLeadFinancialAdvisory } from "@/hooks/useLeadFinancialAdvisory";
import { toast } from "sonner";
import {
  FINANCIAL_ADVISORY_STATUS_CONFIG,
  type FinancialAdvisoryGestionType,
  type FinancialAdvisoryRecord,
  type FinancialAdvisoryStatus,
} from "@/types/finance-advisory.types";

/** Nombre corto desde URL de Storage para mostrar en PDFs (sin mostrar toda la URL). */
function shortNameFromStorageUrl(url: string) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop() || "archivo";
    const decoded = decodeURIComponent(seg);
    return decoded.length > 36 ? `${decoded.slice(0, 34)}…` : decoded;
  } catch {
    return "archivo";
  }
}

export function LeadAsesoriaFinanciamientoTab({ leadId }: { leadId: number }) {
  const {
    records,
    loading,
    updateRecord,
    updating,
    createGestion,
    updateGestion,
    uploadEvidence,
    uploadingEvidence,
  } = useLeadFinancialAdvisory(leadId);

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
              onCreateGestion={createGestion}
              onUpdateGestion={updateGestion}
              onUploadEvidence={uploadEvidence}
              uploadingEvidence={uploadingEvidence}
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
  onCreateGestion,
  onUpdateGestion,
  onUploadEvidence,
  uploadingEvidence,
}: {
  record: FinancialAdvisoryRecord;
  onSave: (id: number, status: FinancialAdvisoryStatus, note: string) => Promise<any>;
  isUpdating: boolean;
  onCreateGestion: (
    asesoriaId: number,
    payload: {
      tipo: FinancialAdvisoryGestionType;
      pdf_urls?: string[];
      image_urls?: string[];
      se_solicito_cedula?: boolean;
      cedula?: string | null;
      banco_deseado?: string | null;
      asesor_contactado_nombre?: string | null;
      asesor_contactado_telefono?: string | null;
      gestion_detalle?: string | null;
      aplica?: boolean | null;
      motivo_no_aplica?: string | null;
      requiere_garante?: boolean;
      garante_detalle?: string | null;
      monto_aprobable_max?: number | null;
      plazo_meses_max?: number | null;
    }
  ) => Promise<any>;
  onUpdateGestion: (gestionId: number, payload: any) => Promise<any>;
  onUploadEvidence: (gestionId: number, file: File) => Promise<any>;
  uploadingEvidence: boolean;
}) {
  const [status, setStatus] = useState<FinancialAdvisoryStatus>(record.estado);
  const [notes, setNotes] = useState(record.notas_vendedor || "");
  const [dirty, setDirty] = useState(false);

  const latestGestion = useMemo(() => (record.gestiones?.[0] ? record.gestiones[0] : null), [record.gestiones]);
  const [selectedGestionId, setSelectedGestionId] = useState<number | null>(latestGestion?.id ?? null);
  const isNewGestion = selectedGestionId == null;

  const selectedGestion = useMemo(() => {
    if (!record.gestiones || record.gestiones.length === 0) return null;
    if (selectedGestionId == null) return null;
    const found = record.gestiones.find((g) => g.id === selectedGestionId);
    return found || record.gestiones[0];
  }, [record.gestiones, selectedGestionId]);

  const [gestionDraft, setGestionDraft] = useState(() => ({
    tipo: (selectedGestion?.tipo ?? "llamada") as FinancialAdvisoryGestionType,
    pdf_urls: (selectedGestion as any)?.pdf_urls ?? [],
    image_urls: (selectedGestion as any)?.image_urls ?? [],
    se_solicito_cedula: selectedGestion?.se_solicito_cedula ?? false,
    cedula: selectedGestion?.cedula ?? "",
    banco_deseado: selectedGestion?.banco_deseado ?? "",
    asesor_contactado_nombre: selectedGestion?.asesor_contactado_nombre ?? "",
    asesor_contactado_telefono: selectedGestion?.asesor_contactado_telefono ?? "",
    gestion_detalle: selectedGestion?.gestion_detalle ?? "",
    aplica: selectedGestion?.aplica ?? null,
    motivo_no_aplica: selectedGestion?.motivo_no_aplica ?? "",
    requiere_garante: selectedGestion?.requiere_garante ?? false,
    garante_detalle: selectedGestion?.garante_detalle ?? "",
    monto_aprobable_max: selectedGestion?.monto_aprobable_max ?? null,
    plazo_meses_max: selectedGestion?.plazo_meses_max ?? null,
  }));

  const [dirtyGestion, setDirtyGestion] = useState(false);

  // Cuando cambia la gestión seleccionada, refrescamos el draft local
  // (mantiene UX simple para un MVP; si quieres edición multi-gestión en paralelo, lo refinamos)
  useEffect(() => {
    if (!selectedGestion) return;
    if (selectedGestionId == null) return;
    setGestionDraft({
      tipo: selectedGestion.tipo,
      pdf_urls: (selectedGestion as any)?.pdf_urls ?? [],
      image_urls: (selectedGestion as any)?.image_urls ?? [],
      se_solicito_cedula: selectedGestion.se_solicito_cedula,
      cedula: selectedGestion.cedula ?? "",
      banco_deseado: selectedGestion.banco_deseado ?? "",
      asesor_contactado_nombre: selectedGestion.asesor_contactado_nombre ?? "",
      asesor_contactado_telefono: selectedGestion.asesor_contactado_telefono ?? "",
      gestion_detalle: selectedGestion.gestion_detalle ?? "",
      aplica: selectedGestion.aplica ?? null,
      motivo_no_aplica: selectedGestion.motivo_no_aplica ?? "",
      requiere_garante: selectedGestion.requiere_garante,
      garante_detalle: selectedGestion.garante_detalle ?? "",
      monto_aprobable_max: selectedGestion.monto_aprobable_max ?? null,
      plazo_meses_max: selectedGestion.plazo_meses_max ?? null,
    });
    setDirtyGestion(false);
  }, [selectedGestionId, selectedGestion]);

  const handleSave = async () => {
    await onSave(record.id, status, notes);
    setDirty(false);
  };

  const handleStartNewGestionDraft = () => {
    setSelectedGestionId(null);
    setGestionDraft({
      tipo: "llamada",
      pdf_urls: [],
      image_urls: [],
      se_solicito_cedula: false,
      cedula: "",
      banco_deseado: "",
      asesor_contactado_nombre: "",
      asesor_contactado_telefono: "",
      gestion_detalle: "",
      aplica: null,
      motivo_no_aplica: "",
      requiere_garante: false,
      garante_detalle: "",
      monto_aprobable_max: null,
      plazo_meses_max: null,
    });
    setDirtyGestion(true);
  };

  /** Payload unificado para crear/actualizar (y para persistir evidencias al instante si ya hay fila en DB). */
  const buildGestionPayload = (d: typeof gestionDraft) => ({
    tipo: d.tipo,
    pdf_urls: d.pdf_urls || [],
    image_urls: d.image_urls || [],
    se_solicito_cedula: d.se_solicito_cedula,
    cedula: d.se_solicito_cedula ? (d.cedula || null) : null,
    banco_deseado: d.banco_deseado || null,
    asesor_contactado_nombre: d.asesor_contactado_nombre || null,
    asesor_contactado_telefono: d.asesor_contactado_telefono || null,
    gestion_detalle: d.gestion_detalle || null,
    aplica: d.aplica,
    motivo_no_aplica: d.aplica === false ? (d.motivo_no_aplica || null) : null,
    requiere_garante: d.requiere_garante,
    garante_detalle: d.requiere_garante ? (d.garante_detalle || null) : null,
    monto_aprobable_max: d.monto_aprobable_max ?? null,
    plazo_meses_max: d.plazo_meses_max ?? null,
  });

  const handleSaveGestion = async () => {
    if (selectedGestionId == null) {
      // Nueva gestión: se crea en DB solo al presionar guardar.
      const res = await onCreateGestion(record.id, buildGestionPayload(gestionDraft));
      if (res?.data?.id) setSelectedGestionId(res.data.id);
      setDirtyGestion(false);
      return;
    }

    if (!selectedGestion) return;
    await onUpdateGestion(selectedGestion.id, buildGestionPayload(gestionDraft));
    setDirtyGestion(false);
  };

  /** Si la gestión ya existe en DB, persiste el borrador completo (incluye pdf_urls / image_urls) sin esperar al botón. */
  const persistGestionIfSaved = async (nextDraft: typeof gestionDraft) => {
    if (selectedGestionId == null || !selectedGestion) return;
    try {
      const res = await onUpdateGestion(selectedGestion.id, buildGestionPayload(nextDraft));
      if (!res?.success) throw res?.error ?? new Error("No se pudo actualizar la gestión.");
      setDirtyGestion(false);
    } catch (err) {
      console.error("Error persisting gestion after evidence change:", err);
      toast.error("No se pudo guardar la evidencia en la gestión. Intenta de nuevo.");
      // Mantenemos el estado local; el usuario puede reintentar o presionar Guardar Gestión.
      setDirtyGestion(true);
    }
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
        <div className="grid gap-3">
          <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Estado de la asesoría</label>
          <div className="flex flex-wrap gap-2">
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

        {/* Gestión realizada */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Gestión realizada</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Registra si se llamó, si fue personal o si se gestionó por mensaje, y los datos/evidencias.
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartNewGestionDraft}
              className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Agregar nueva gestión (se guarda al presionar Guardar Gestión)"
            >
              + Agregar
            </button>
          </div>

          {record.gestiones.length === 0 && !isNewGestion ? (
            <div className="mt-3 text-xs text-slate-500 bg-white border border-dashed border-slate-200 rounded-lg p-3">
              Todavía no hay gestiones registradas para esta asesoría. Presiona <strong>+ Agregar</strong> para iniciar.
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              {/* Selector de gestión (últimas 3 por simplicidad visual) */}
              <div className="flex flex-wrap gap-2">
                {isNewGestion && (
                  <button
                    type="button"
                    onClick={() => setSelectedGestionId(null)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors bg-slate-900 text-white border-slate-900"
                    title="Borrador (no guardado)"
                  >
                    nueva ({gestionDraft.tipo}) • {new Date().toLocaleDateString()}
                  </button>
                )}
                {record.gestiones.slice(0, 3).map((g) => (
                  (() => {
                    const isSelected = selectedGestion?.id === g.id;
                    const displayTipo = isSelected ? gestionDraft.tipo : g.tipo;
                    return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGestionId(g.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                    title={new Date(g.created_at).toLocaleString()}
                  >
                    {displayTipo} • {new Date(g.created_at).toLocaleDateString()}
                  </button>
                    );
                  })()
                ))}
              </div>

              {/* Tipo de gestión */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {(
                  [
                    { key: "llamada", label: "Llamada", icon: PhoneCall },
                    { key: "personal", label: "Personal", icon: UserRound },
                    { key: "mensaje", label: "Mensaje", icon: Send },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setGestionDraft((p) => ({ ...p, tipo: opt.key }));
                      setDirtyGestion(true);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      gestionDraft.tipo === opt.key
                        ? "bg-white border-emerald-300 text-emerald-800 ring-2 ring-emerald-200/60"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Datos solicitados / banco */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600">Cédula</label>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <input
                        type="checkbox"
                        checked={gestionDraft.se_solicito_cedula}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setGestionDraft((p) => ({ ...p, se_solicito_cedula: v, cedula: v ? p.cedula : "" }));
                          setDirtyGestion(true);
                        }}
                      />
                      Se solicitó
                    </label>
                  </div>
                  <input
                    className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:opacity-60"
                    placeholder="Ej: 1712345678"
                    value={gestionDraft.cedula}
                    disabled={!gestionDraft.se_solicito_cedula}
                    onChange={(e) => {
                      setGestionDraft((p) => ({ ...p, cedula: e.target.value }));
                      setDirtyGestion(true);
                    }}
                  />
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label className="text-[11px] font-semibold text-slate-600">Banco deseado</label>
                  <input
                    className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    placeholder="Ej: Pichincha, Produbanco..."
                    value={gestionDraft.banco_deseado}
                    onChange={(e) => {
                      setGestionDraft((p) => ({ ...p, banco_deseado: e.target.value }));
                      setDirtyGestion(true);
                    }}
                  />
                </div>
              </div>

              {/* Asesor contactado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label className="text-[11px] font-semibold text-slate-600">Asesor contactado (nombre)</label>
                  <input
                    className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    placeholder="Ej: Carlos Pérez"
                    value={gestionDraft.asesor_contactado_nombre}
                    onChange={(e) => {
                      setGestionDraft((p) => ({ ...p, asesor_contactado_nombre: e.target.value }));
                      setDirtyGestion(true);
                    }}
                  />
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label className="text-[11px] font-semibold text-slate-600">Asesor contactado (teléfono)</label>
                  <input
                    className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    placeholder="Ej: 09xxxxxxx"
                    value={gestionDraft.asesor_contactado_telefono}
                    onChange={(e) => {
                      setGestionDraft((p) => ({ ...p, asesor_contactado_telefono: e.target.value }));
                      setDirtyGestion(true);
                    }}
                  />
                </div>
              </div>

              {/* Detalle de gestión */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <label className="text-[11px] font-semibold text-slate-600">Qué gestión se hizo</label>
                <textarea
                  className="mt-2 w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none bg-slate-50 placeholder:text-slate-400"
                  rows={3}
                  placeholder="Ej: Se llamó al cliente, se solicitó cédula y rol de pagos. Se contactó al asesor del banco y se envió documentación..."
                  value={gestionDraft.gestion_detalle}
                  onChange={(e) => {
                    setGestionDraft((p) => ({ ...p, gestion_detalle: e.target.value }));
                    setDirtyGestion(true);
                  }}
                />
              </div>

              {/* Resultado + límites */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label className="text-[11px] font-semibold text-slate-600">¿El cliente puede aplicar?</label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGestionDraft((p) => ({ ...p, aplica: true, motivo_no_aplica: "" }));
                        setDirtyGestion(true);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        gestionDraft.aplica === true
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Sí aplica
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGestionDraft((p) => ({ ...p, aplica: false }));
                        setDirtyGestion(true);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        gestionDraft.aplica === false
                          ? "bg-red-50 text-red-800 border-red-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      No aplica
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGestionDraft((p) => ({ ...p, aplica: null, motivo_no_aplica: "" }));
                        setDirtyGestion(true);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        gestionDraft.aplica === null
                          ? "bg-slate-100 text-slate-800 border-slate-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                      title="Sin definir"
                    >
                      N/D
                    </button>
                  </div>

                  {gestionDraft.aplica === false && (
                    <textarea
                      className="mt-2 w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none bg-slate-50 placeholder:text-slate-400"
                      rows={2}
                      placeholder="Motivo (ej: score, ingresos insuficientes, falta de documentación...)"
                      value={gestionDraft.motivo_no_aplica}
                      onChange={(e) => {
                        setGestionDraft((p) => ({ ...p, motivo_no_aplica: e.target.value }));
                        setDirtyGestion(true);
                      }}
                    />
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label className="text-[11px] font-semibold text-slate-600">Hasta dónde puede (referencial)</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Monto máx.</div>
                      <input
                        type="number"
                        className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        placeholder="Ej: 12000"
                        value={gestionDraft.monto_aprobable_max ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          setGestionDraft((p) => ({ ...p, monto_aprobable_max: v }));
                          setDirtyGestion(true);
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Plazo (meses)</div>
                      <input
                        type="number"
                        className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        placeholder="Ej: 60"
                        value={gestionDraft.plazo_meses_max ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          setGestionDraft((p) => ({ ...p, plazo_meses_max: v }));
                          setDirtyGestion(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Garantes */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-600">¿Requiere garantes?</label>
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      checked={gestionDraft.requiere_garante}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setGestionDraft((p) => ({ ...p, requiere_garante: v, garante_detalle: v ? p.garante_detalle : "" }));
                        setDirtyGestion(true);
                      }}
                    />
                    Sí
                  </label>
                </div>
                {gestionDraft.requiere_garante && (
                  <textarea
                    className="mt-2 w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none bg-slate-50 placeholder:text-slate-400"
                    rows={2}
                    placeholder="Qué datos se requieren del garante (opcional)."
                    value={gestionDraft.garante_detalle}
                    onChange={(e) => {
                      setGestionDraft((p) => ({ ...p, garante_detalle: e.target.value }));
                      setDirtyGestion(true);
                    }}
                  />
                )}
              </div>

              {/* Evidencias: PDFs + imágenes (miniaturas); + para seguir subiendo */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-slate-600 mb-1">
                  Evidencias
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Puedes subir varios PDFs e imágenes. Usa <strong>+</strong> para añadir otro. Si la gestión{" "}
                  <strong>ya está guardada</strong>, las URLs se guardan en la base al subir o quitar archivos. En un{" "}
                  <strong>borrador nuevo</strong>, pulsa <strong>Guardar Gestión</strong> al menos una vez para crear la
                  fila; después también se actualizan las columnas al instante.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* PDFs */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      PDFs
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {((gestionDraft as any).pdf_urls || []).map((url: string, idx: number) => (
                        <div
                          key={`pdf-${url}-${idx}`}
                          className="flex flex-col w-[calc(50%-0.25rem)] min-w-[140px] max-w-[200px] rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="shrink-0 rounded-lg bg-red-50 p-2 text-red-600">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-slate-500">PDF {idx + 1}</div>
                              <div className="text-[10px] text-slate-600 truncate" title={url}>
                                {shortNameFromStorageUrl(url)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-auto">
                            <button
                              type="button"
                              className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-100"
                              onClick={async () => {
                                const nextDraft = {
                                  ...gestionDraft,
                                  pdf_urls: (gestionDraft.pdf_urls || []).filter((x: string) => x !== url),
                                };
                                setGestionDraft(nextDraft);
                                if (selectedGestionId != null && selectedGestion) {
                                  await persistGestionIfSaved(nextDraft);
                                } else {
                                  setDirtyGestion(true);
                                }
                              }}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}

                      <label
                        htmlFor="evidencia-pdf-input"
                        className={`
                          flex flex-col items-center justify-center min-h-[112px] w-[calc(50%-0.25rem)] min-w-[140px] max-w-[200px]
                          rounded-xl border-2 border-dashed cursor-pointer transition-colors
                          ${uploadingEvidence ? "border-slate-200 bg-slate-100 opacity-60 pointer-events-none" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40"}
                        `}
                      >
                        <Plus className="h-7 w-7 text-slate-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-600 text-center px-1">
                          {uploadingEvidence ? "Subiendo…" : "Añadir PDF"}
                        </span>
                        <input
                          id="evidencia-pdf-input"
                          type="file"
                          className="hidden"
                          accept="application/pdf"
                          disabled={uploadingEvidence}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const gid = selectedGestionId ?? 0;
                            const res = await onUploadEvidence(gid, f);
                            if (res?.success && res.publicUrl) {
                              const nextDraft = {
                                ...gestionDraft,
                                pdf_urls: [...(gestionDraft.pdf_urls || []), res.publicUrl],
                              };
                              setGestionDraft(nextDraft);
                              if (selectedGestionId != null && selectedGestion) {
                                await persistGestionIfSaved(nextDraft);
                              } else {
                                setDirtyGestion(true);
                              }
                            }
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Imágenes (miniaturas) */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                      <FileImage className="h-4 w-4 text-emerald-600" />
                      Imágenes
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {((gestionDraft as any).image_urls || []).map((url: string, idx: number) => (
                        <div
                          key={`img-${url}-${idx}`}
                          className="group relative w-[88px] h-[88px] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Evidencia ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />
                          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/95 text-slate-800 shadow"
                              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white shadow"
                              onClick={async () => {
                                const nextDraft = {
                                  ...gestionDraft,
                                  image_urls: (gestionDraft.image_urls || []).filter((x: string) => x !== url),
                                };
                                setGestionDraft(nextDraft);
                                if (selectedGestionId != null && selectedGestion) {
                                  await persistGestionIfSaved(nextDraft);
                                } else {
                                  setDirtyGestion(true);
                                }
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}

                      <label
                        htmlFor="evidencia-img-input"
                        className={`
                          flex flex-col items-center justify-center w-[88px] h-[88px] rounded-xl border-2 border-dashed cursor-pointer transition-colors shrink-0
                          ${uploadingEvidence ? "border-slate-200 bg-slate-100 opacity-60 pointer-events-none" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40"}
                        `}
                      >
                        <Plus className="h-8 w-8 text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-600 mt-0.5 text-center leading-tight px-0.5">
                          {uploadingEvidence ? "…" : "Añadir"}
                        </span>
                        <input
                          id="evidencia-img-input"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          disabled={uploadingEvidence}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const gid = selectedGestionId ?? 0;
                            const res = await onUploadEvidence(gid, f);
                            if (res?.success && res.publicUrl) {
                              const nextDraft = {
                                ...gestionDraft,
                                image_urls: [...(gestionDraft.image_urls || []), res.publicUrl],
                              };
                              setGestionDraft(nextDraft);
                              if (selectedGestionId != null && selectedGestion) {
                                await persistGestionIfSaved(nextDraft);
                              } else {
                                setDirtyGestion(true);
                              }
                            }
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {dirtyGestion && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveGestion}
                    className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar Gestión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notas internas (se mantienen como complemento rápido) */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Notas internas (opcional)</label>
          <textarea
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none bg-slate-50 placeholder:text-slate-400"
            rows={2}
            placeholder="Notas rápidas para el equipo (no reemplaza la gestión)."
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
