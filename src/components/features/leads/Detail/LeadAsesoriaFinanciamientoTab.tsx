import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, FileImage, FileText, Landmark, PhoneCall, Plus, Save, Send, UserRound, WalletCards } from "lucide-react";
import { useLeadFinancialAdvisory } from "@/hooks/useLeadFinancialAdvisory";
import { toast } from "sonner";
import {
  FINANCIAL_ADVISORY_STATUS_CONFIG,
  advisoryInternalNotesFilled,
  missingFinancialAdvisoryFields,
  type FinancialAdvisoryGestionType,
  type FinancialAdvisoryRecord,
  type FinancialAdvisoryStatus,
} from "@/types/finance-advisory.types";

function notifyMissingGestion(title: string, missing: string[]) {
  toast.error(title, {
    description: (
      <ul className="mt-1.5 space-y-1">
        {missing.map((field) => (
          <li key={field} className="flex items-start gap-1.5 text-[12px] leading-snug">
            <span className="mt-px opacity-70">•</span>
            <span>{field}</span>
          </li>
        ))}
      </ul>
    ),
    duration: 7000,
  });
}

function MissingGestionBanner({ fields }: { fields: string[] }) {
  return (
    <div className="mt-3 rounded-xl border border-red-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 rounded-lg bg-red-100 p-1.5 text-red-600">
          <CircleAlert className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-red-800">Falta completar la gestión</p>
          <p className="mt-0.5 text-[11px] text-red-600/90">
            Sin esto no se puede pasar a En proceso ni a Resuelto · no aplica.
            Si no contestó o no dio cédula, marca Resuelto y escribe las notas.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {fields.map((field) => (
              <li
                key={field}
                className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-800"
              >
                {field}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
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

  const displayRecord = useMemo(() => pickSingleAdvisory(records), [records]);

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

      {!displayRecord ? (
        <div className="text-center p-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          <WalletCards className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay solicitudes de asesoria financiera para este lead.</p>
        </div>
      ) : (
        <FinancialAdvisoryCard
          record={displayRecord}
          onSave={updateRecord}
          isUpdating={updating === displayRecord.id}
          onCreateGestion={createGestion}
          onUpdateGestion={updateGestion}
          onUploadEvidence={uploadEvidence}
          uploadingEvidence={uploadingEvidence}
        />
      )}
    </div>
  );
}

function advisoryTime(record: FinancialAdvisoryRecord): number {
  const t = record.fecha_solicitud ? new Date(record.fecha_solicitud).getTime() : 0;
  return Number.isFinite(t) ? t : record.id;
}

function advisoryRank(estado: FinancialAdvisoryRecord["estado"]): number {
  if (estado === "en_proceso") return 0;
  if (estado === "pendiente") return 1;
  return 2;
}

/** Un cliente = una asesoría en pantalla, aunque haya filas duplicadas. */
function pickSingleAdvisory(records: FinancialAdvisoryRecord[]): FinancialAdvisoryRecord | null {
  if (records.length === 0) return null;

  const primary = [...records].sort((a, b) => {
    const byStatus = advisoryRank(a.estado) - advisoryRank(b.estado);
    if (byStatus !== 0) return byStatus;
    return advisoryTime(b) - advisoryTime(a);
  })[0];

  const gestiones = records
    .flatMap((row) => row.gestiones ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const seen = new Set<number>();
  const uniqueGestiones = gestiones.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });

  return { ...primary, gestiones: uniqueGestiones };
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
  const [requireGestionComplete, setRequireGestionComplete] = useState(false);
  const [requireNotes, setRequireNotes] = useState(false);
  const gestionBoxRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const notesFilled = advisoryInternalNotesFilled(notes);

  const missingDraftFields = useMemo(
    () => missingFinancialAdvisoryFields(gestionDraft),
    [gestionDraft]
  );
  const hasCompleteSavedGestion = useMemo(
    () => (record.gestiones ?? []).some((g) => missingFinancialAdvisoryFields(g).length === 0),
    [record.gestiones]
  );
  const canSetAdvancedStatus = hasCompleteSavedGestion || missingDraftFields.length === 0;
  const showMissing = (label: string) =>
    requireGestionComplete && missingDraftFields.includes(label);
  const fieldBox = (label: string) =>
    `rounded-lg p-3 border ${
      showMissing(label)
        ? "border-red-300 bg-red-50/80 ring-1 ring-red-200"
        : "bg-white border-slate-200"
    }`;

  const openGestionForm = () => {
    if (record.gestiones.length === 0) {
      setSelectedGestionId(null);
      setDirtyGestion(true);
    }
    setRequireGestionComplete(true);
    requestAnimationFrame(() => {
      gestionBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const blockNotesRequired = (s: FinancialAdvisoryStatus) => {
    const label = FINANCIAL_ADVISORY_STATUS_CONFIG[s].label;
    setRequireNotes(true);
    requestAnimationFrame(() => {
      notesRef.current?.focus();
      notesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    toast.error(`No se puede marcar ${label}`, {
      description: "Escribe las notas: no contestó, no dio cédula, u otra constancia.",
      duration: 6000,
    });
  };

  const blockAdvancedStatus = (s: FinancialAdvisoryStatus) => {
    const label = FINANCIAL_ADVISORY_STATUS_CONFIG[s].label;
    const missing = missingDraftFields.length > 0 ? missingDraftFields : ["todos los campos de la gestión"];
    openGestionForm();
    notifyMissingGestion(`No se puede marcar ${label}`, missing);
  };

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

  const savedGestionMatchesStatus = (s: FinancialAdvisoryStatus) => {
    if (s === "resuelto_no_aplica") {
      return (record.gestiones ?? []).some(
        (g) => g.aplica === false && missingFinancialAdvisoryFields(g).length === 0
      );
    }
    return hasCompleteSavedGestion;
  };

  const handleSave = async () => {
    if (status === "resuelto" && !notesFilled) {
      blockNotesRequired(status);
      return;
    }
    if (status === "resuelto_no_aplica" && !notesFilled) {
      blockNotesRequired(status);
      return;
    }
    if (status === "en_proceso" || status === "resuelto_no_aplica") {
      if (!savedGestionMatchesStatus(status)) {
        if (missingDraftFields.length > 0) {
          blockAdvancedStatus(status);
          return;
        }
        let ok = false;
        if (selectedGestionId == null) {
          const created = await onCreateGestion(record.id, buildGestionPayload(gestionDraft));
          ok = Boolean(created?.success);
          if (created?.data?.id) setSelectedGestionId(created.data.id);
        } else if (selectedGestion) {
          const updated = await onUpdateGestion(selectedGestion.id, buildGestionPayload(gestionDraft));
          ok = Boolean(updated?.success);
        }
        if (!ok) {
          toast.error("No se pudo guardar la gestión. Completa los campos e intenta de nuevo.");
          return;
        }
        setDirtyGestion(false);
      }
    }
    const res = await onSave(record.id, status, notes);
    if (!res?.success) {
      toast.error(
        res?.error === "notes_required"
          ? "Escribe las notas para marcar Resuelto (no contestó o no dio cédula)."
          : res?.error === "complete_gestion_required"
            ? "Llena la gestión para En proceso o Resuelto · no aplica. Si no hay cédula, marca Resuelto y escribe las notas."
            : "No se pudo guardar el estado."
      );
      return;
    }
    setRequireNotes(false);
    setDirty(false);
  };

  const handleSaveGestion = async () => {
    const missing = missingFinancialAdvisoryFields(gestionDraft);
    if (missing.length > 0) {
      setRequireGestionComplete(true);
      notifyMissingGestion("Completa la gestión", missing);
      return;
    }
    if (selectedGestionId == null) {
      const res = await onCreateGestion(record.id, buildGestionPayload(gestionDraft));
      if (!res?.success) {
        toast.error("No se pudo guardar la gestión. Completa los campos e intenta de nuevo.");
        return;
      }
      if (res?.data?.id) setSelectedGestionId(res.data.id);
      if (status === "pendiente") {
        setStatus("en_proceso");
        const saved = await onSave(record.id, "en_proceso", notes);
        if (!saved?.success) {
          toast.error(
            saved?.error === "complete_gestion_required"
              ? "Llena la gestión completa para pasar a En proceso."
              : "La gestión se guardó, pero no se pudo cambiar el estado."
          );
          setDirty(true);
          return;
        }
        setDirty(false);
      }
      setDirtyGestion(false);
      toast.success("Gestión guardada. Suma en Asesoría avanzada.");
      return;
    }

    if (!selectedGestion) return;
    const updated = await onUpdateGestion(selectedGestion.id, buildGestionPayload(gestionDraft));
    if (!updated?.success) {
      toast.error("No se pudo guardar la gestión. Completa los campos e intenta de nuevo.");
      return;
    }
    if (status === "pendiente") {
      setStatus("en_proceso");
      const saved = await onSave(record.id, "en_proceso", notes);
      if (!saved?.success) {
        toast.error(
          saved?.error === "complete_gestion_required"
            ? "Llena la gestión completa para pasar a En proceso."
            : "La gestión se guardó, pero no se pudo cambiar el estado."
        );
        setDirty(true);
        return;
      }
      setDirty(false);
    }
    setDirtyGestion(false);
    toast.success("Gestión guardada. Suma en Asesoría avanzada.");
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
    se_solicito_cedula: Boolean(d.cedula?.trim()),
    cedula: d.cedula?.trim() ? d.cedula.trim() : null,
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
          <p className="text-[10px] text-slate-400 -mt-2 mb-1">
            Resuelto: si no contestó o no dio cédula, escribe las notas y márcalo — queda resuelto. En proceso y
            Resuelto · no aplica piden la gestión de abajo (sin cédula).
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FINANCIAL_ADVISORY_STATUS_CONFIG) as FinancialAdvisoryStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (s === status) return;
                  if (s === "resuelto") {
                    if (!advisoryInternalNotesFilled(notes)) {
                      blockNotesRequired(s);
                      return;
                    }
                    setRequireGestionComplete(false);
                    setStatus(s);
                    setDirty(true);
                    return;
                  }
                  if (s === "resuelto_no_aplica") {
                    if (!advisoryInternalNotesFilled(notes)) {
                      blockNotesRequired(s);
                    }
                    const nextDraft = { ...gestionDraft, aplica: false as boolean | null };
                    setGestionDraft(nextDraft);
                    setDirtyGestion(true);
                    const savedNoAplica = (record.gestiones ?? []).some(
                      (g) => g.aplica === false && missingFinancialAdvisoryFields(g).length === 0
                    );
                    const draftOk = missingFinancialAdvisoryFields(nextDraft).length === 0;
                    if (!savedNoAplica && !draftOk) {
                      blockAdvancedStatus(s);
                      return;
                    }
                    if (!advisoryInternalNotesFilled(notes)) return;
                    setStatus(s);
                    setDirty(true);
                    return;
                  }
                  if (s === "en_proceso" && !canSetAdvancedStatus) {
                    blockAdvancedStatus(s);
                    return;
                  }
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
        <div
          ref={gestionBoxRef}
          className={`rounded-xl border p-3 ${
            requireGestionComplete && missingDraftFields.length > 0
              ? "border-red-300 bg-red-50/50"
              : "border-slate-200 bg-slate-50/40"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Gestión realizada</div>
              <div className="text-xs text-slate-500 mt-0.5">
                En proceso y Resuelto · no aplica: tipo, si aplica y banco si aplica. Cédula no es obligatoria. Si el
                cliente no contestó o no la dio, usa Resuelto y las notas.
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

          {requireGestionComplete && missingDraftFields.length > 0 && (
            <MissingGestionBanner fields={missingDraftFields} />
          )}

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
                <div className="rounded-lg p-3 border bg-white border-slate-200">
                  <label className="text-[11px] font-semibold text-slate-600">Cédula</label>
                  <p className="text-[10px] text-slate-400 mt-0.5">Opcional. Si no la da, no bloquea Resuelto.</p>
                  <input
                    className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    placeholder="Ej: 1712345678"
                    value={gestionDraft.cedula}
                    onChange={(e) => {
                      const value = e.target.value;
                      setGestionDraft((p) => ({
                        ...p,
                        cedula: value,
                        se_solicito_cedula: Boolean(value.trim()),
                      }));
                      setDirtyGestion(true);
                    }}
                  />
                </div>

                <div className={fieldBox("banco deseado")}>
                  <label className="text-[11px] font-semibold text-slate-600">
                    Banco deseado {showMissing("banco deseado") ? "*" : ""}
                  </label>
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

              <div
                className={fieldBox(
                  showMissing("motivo de no aplica") ? "motivo de no aplica" : "si el cliente puede aplicar"
                )}
              >
                <label className="text-[11px] font-semibold text-slate-600">
                  ¿El cliente puede aplicar? {showMissing("si el cliente puede aplicar") ? "*" : ""}
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Solo si hay con qué evaluar. Si no contestó o no dio cédula, deja N/D y marca Resuelto.
                </p>
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

        <div className={requireNotes && !notesFilled ? "rounded-lg p-3 border border-red-300 bg-red-50/80 ring-1 ring-red-200" : ""}>
          <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
            Notas internas *
          </label>
          <p className="text-[10px] text-slate-400 -mt-1 mb-1.5">
            Obligatorias para Resuelto: no contestó, no dio cédula, u otra constancia. Con eso queda resuelto.
          </p>
          <textarea
            ref={notesRef}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none bg-slate-50 placeholder:text-slate-400"
            rows={2}
            placeholder="Ej: no contestó, no quiso dar cédula, quedó pendiente de documentos…"
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
