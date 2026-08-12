"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  History,
  Plus,
  Scale,
  Target,
  Car,
  Banknote,
  PhoneOff,
  Activity,
  FileText,
  ListTodo,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  UserCircle,
  FileUp,
  ExternalLink,
  Image as ImageIcon,
  Phone,
  Bell,
  MapPin,
  HandCoins,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type {
  CaseFullPayload,
  LegalCaseContext,
  LegalCaseRow,
  CaseEventRow,
  CaseStepSkipRow,
} from "@/types/legal.types";
import type { NotaGestion } from "@/types/wallet.types";
import { GestionStepList } from "./GestionStepList";
import { AddEventForm } from "./AddEventForm";
import { ChangeStatusForm } from "./ChangeStatusForm";
import { ChangeProcessForm } from "./ChangeProcessForm";
import { AddTaskForm } from "./AddTaskForm";
import { legalCasesService } from "@/services/legalCases.service";
import {
  eventBelongsToPipeline,
  inferPoderEspecialFromEvents,
  labelEstadoVehiculo,
  parseDetalleMeta,
  stripMetaTags,
  type LegalPipeline,
} from "./legalGestionCatalogs";
import {
  canAccessStep,
  formalStepLabel,
  SKIP_MOTIVO_LABELS,
  type SkipMotivo,
} from "./formalStepAccess";
import { SkipStepWarningModal } from "./SkipStepWarningModal";

type TimelineItem =
  | { kind: "event"; id: string; at: string; event: CaseEventRow }
  | { kind: "skip"; id: string; at: string; skip: CaseStepSkipRow }
  | { kind: "externo"; id: string; at: string; nota: NotaGestion };

const OPERATIVA_EVENT_ICONS: Record<string, LucideIcon> = {
  llamada: Phone,
  mensaje: MessageCircle,
  whatsapp: MessageCircle,
  recordatorio: Bell,
  notificacion: Bell,
  visita_cortesia: MapPin,
  acuerdo_pago: HandCoins,
  nota: StickyNote,
};

function operativaEventIcon(tipo: string | null | undefined): LucideIcon {
  const t = (tipo || "").toLowerCase().trim();
  return OPERATIVA_EVENT_ICONS[t] || MessageCircle;
}

function canalPillLabel(canal: string | null | undefined): string | null {
  if (!canal) return null;
  const c = canal.toLowerCase();
  if (c === "whatsapp") return "Whatsapp";
  if (c === "telefono") return "Telefono";
  if (c === "presencial") return "Presencial";
  if (c === "email") return "Email";
  if (c === "mensaje") return "Mensaje";
  if (c === "sistema") return null;
  return canal;
}

const CANALES_COMUNICACION = new Set([
  "telefono",
  "whatsapp",
  "email",
  "presencial",
  "mensaje",
]);

/**
 * Algunas gestiones antiguas se guardaron como tipo `creacion` pero son llamadas
 * u otras gestiones (canal + descripción). No deben quedar ocultas en «Sistema».
 */
function looksLikeOperativaGestion(e: CaseEventRow): boolean {
  const t = (e.tipo || "").toLowerCase().trim();
  if (t && t !== "creacion" && t !== "sistema") return true;
  const canal = (e.canal || "").toLowerCase().trim();
  if (CANALES_COMUNICACION.has(canal)) return true;
  const desc = `${e.descripcion || ""} ${e.detalle || ""}`.toLowerCase();
  return /llamada|whatsapp|visita|acuerdo|recordatorio|mensaje/.test(desc);
}

/** Etiqueta visible en bitácora operativa (corrige creacion→llamada cuando aplica). */
function operativaDisplayTipo(e: CaseEventRow): string {
  const t = (e.tipo || "").toLowerCase().trim();
  if (t === "creacion" && looksLikeOperativaGestion(e)) {
    const canal = (e.canal || "").toLowerCase().trim();
    if (canal === "telefono") return "llamada";
    if (canal === "whatsapp") return "whatsapp";
    if (canal === "presencial") return "visita_cortesia";
    if (canal === "email") return "email";
    if (canal === "mensaje") return "mensaje";
    const desc = (e.descripcion || "").toLowerCase();
    if (desc.includes("llamada")) return "llamada";
  }
  return e.tipo || "evento";
}

function isNotaEvent(e: CaseEventRow): boolean {
  const t = (e.tipo || "").toLowerCase();
  return t.includes("nota") || t === "observacion" || t === "observación";
}

function isPureSistemaEvent(e: CaseEventRow): boolean {
  const t = (e.tipo || "").toLowerCase().trim();
  if (["cambio_estado", "cambio_proceso", "sistema"].includes(t)) return true;
  // `creacion` real de apertura (sin canal de gestión)
  if (t === "creacion" && !looksLikeOperativaGestion(e)) return true;
  return false;
}

/** UI clásica Temprana/Media (timeline) — solo presentación. */
function OperativaEventCard({
  event: e,
  actors,
}: {
  event: CaseEventRow;
  actors: CaseFullPayload["actors"];
}) {
  const displayTipo = operativaDisplayTipo(e);
  const Icon = operativaEventIcon(displayTipo);
  const canalLabel = canalPillLabel(e.canal);
  const detalleTexto = e.detalle ? stripMetaTags(e.detalle) : "";

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-4 bottom-0 w-px bg-slate-200" />
      <div className="absolute left-[-7px] top-4 h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white z-[1]" />
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-blue-50/50 border-blue-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-blue-800 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide text-blue-800 truncate">
              {displayTipo.replace(/_/g, " ")}
            </span>
            {canalLabel && (
              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                {canalLabel}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5 shrink-0">
            <Clock className="h-3 w-3" />
            {e.fecha
              ? new Date(e.fecha).toLocaleString("es-EC")
              : "—"}
          </span>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-800">
            {e.descripcion || "—"}
          </p>
          {detalleTexto ? (
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
              &ldquo;{detalleTexto}&rdquo;
            </p>
          ) : null}
          <EventAdjuntosView
            documentoId={e.documento_id}
            imagenesIds={e.imagenes_ids}
          />
          <div className="flex items-center justify-between pt-1">
            {e.resultado ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                {e.resultado}
              </span>
            ) : (
              <span />
            )}
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <UserCircle className="h-3.5 w-3.5" />
              {lineaRegistrante(actors, e.usuario_id) || "Sistema"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorialExternoCard({ nota }: { nota: NotaGestion }) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-4 bottom-0 w-px bg-slate-200" />
      <div className="absolute left-[-7px] top-4 h-3.5 w-3.5 rounded-full border-2 border-amber-300 bg-white z-[1]" />
      <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-amber-50/60 border-amber-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <StickyNote className="h-4 w-4 text-amber-800 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide text-amber-900 truncate">
              Historial previo
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5 shrink-0">
            <Clock className="h-3 w-3" />
            {nota.fecha
              ? new Date(nota.fecha).toLocaleString("es-EC")
              : "—"}
          </span>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-slate-700 leading-relaxed">
            {nota.observacion || "—"}
          </p>
          <div className="flex justify-end pt-1">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <UserCircle className="h-3.5 w-3.5" />
              {nota.usuario || "Usuario"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[8vh] sm:pt-[6vh]">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function EventDetalleView({ detalle }: { detalle: string }) {
  const { chips, texto } = parseDetalleMeta(detalle);
  if (!chips.length && !texto) return null;

  const toneClass = {
    ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    bad: "bg-slate-100 text-slate-600 border-slate-200",
    neutral: "bg-indigo-50 text-indigo-800 border-indigo-200",
  } as const;

  return (
    <div className="space-y-2">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={`${chip.key}-${chip.value}`}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${toneClass[chip.tone]}`}
            >
              <span className="opacity-70">{chip.label}:</span>
              {chip.valueLabel}
            </span>
          ))}
        </div>
      )}
      {texto ? (
        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
          &ldquo;{texto}&rdquo;
        </p>
      ) : null}
    </div>
  );
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

function EventAdjuntosView({
  documentoId,
  imagenesIds,
}: {
  documentoId?: string | null;
  imagenesIds?: string[] | null;
}) {
  const images = (imagenesIds ?? []).filter(Boolean);
  const doc = documentoId?.trim() || null;
  if (!doc && images.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Adjuntos
      </p>
      {doc && (
        <a
          href={doc}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-400 transition"
        >
          <FileUp className="h-4 w-4 text-slate-600 shrink-0" />
          <span className="truncate flex-1">Documento PDF</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        </a>
      )}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url) =>
            isImageUrl(url) ? (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="relative h-16 w-16 rounded-lg overflow-hidden border border-slate-200 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Adjunto"
                  className="h-full w-full object-cover"
                />
              </a>
            ) : (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Ver imagen
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function lineaRegistrante(
  actors: CaseFullPayload["actors"],
  usuarioId: string | null | undefined,
) {
  if (!usuarioId || !actors?.[usuarioId]) return null;
  const a = actors[usuarioId];
  const name = (a.full_name || "").trim();
  const role = (a.role || "").trim();
  if (name && role) return `${name} · ${role}`;
  return name || role || null;
}

export function LegalCaseWorkspace({
  legalContext,
  caseRow,
  data,
  pipeline,
  operativeOnly,
  requireFormalGates,
  historialExterno = [],
  onRefresh,
}: {
  legalContext: LegalCaseContext;
  caseRow: LegalCaseRow;
  data: CaseFullPayload;
  pipeline: LegalPipeline;
  operativeOnly: boolean;
  requireFormalGates: boolean;
  /** Notas Oracle / gestiones previas al caso (solo se muestran en Temprana/Media). */
  historialExterno?: NotaGestion[];
  onRefresh: () => Promise<void> | void;
}) {
  const c = data.case || caseRow;
  const [panel, setPanel] = useState<
    "bitacora" | "pickTipo" | "gestion" | "observacion" | "status" | "process"
  >("bitacora");
  const [selectedTipo, setSelectedTipo] = useState<string | undefined>();
  const [skipWarning, setSkipWarning] = useState<{
    stepKey: string;
    skippedSteps: string[];
  } | null>(null);
  const [checkingSkip, setCheckingSkip] = useState(false);
  const [bitacoraTab, setBitacoraTab] = useState<
    | "todas"
    | "gestiones"
    | "saltos"
    | "comunicaciones"
    | "observaciones"
    | "tareas"
    | "sistema"
  >(pipeline === "formal" ? "gestiones" : "todas");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState<string | null>(null);

  const poder = inferPoderEspecialFromEvents(data.events ?? []);
  const allEvents = data.events ?? [];
  const formalEvents = allEvents.filter((e) =>
    eventBelongsToPipeline(e.tipo, "formal"),
  );
  /** Solo gestiones de Temprana/Media — nunca tipos formales. */
  const operativaEvents = allEvents.filter((e) =>
    eventBelongsToPipeline(e.tipo, "operativa"),
  );

  // Si Formal no tiene gestiones de pipeline pero sí notas, abrir Observaciones
  useEffect(() => {
    if (pipeline !== "formal") return;
    if (formalEvents.length > 0) return;
    if (allEvents.some(isNotaEvent)) {
      setBitacoraTab("observaciones");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline, caseRow.id]);

  const bitacoraTabs =
    pipeline === "formal"
      ? ([
          ["gestiones", "Gestiones"],
          ["saltos", "Saltos"],
          ["observaciones", "Observaciones"],
          ["sistema", "Sistema"],
        ] as const)
      : ([
          ["todas", "Todo"],
          ["comunicaciones", "Comunicaciones"],
          ["observaciones", "Observaciones"],
          ["tareas", "Tareas"],
          ["sistema", "Sistema"],
        ] as const);

  const activeBitacoraTab = bitacoraTabs.some(([id]) => id === bitacoraTab)
    ? bitacoraTab
    : pipeline === "formal"
      ? "gestiones"
      : "todas";

  const timelineItems: TimelineItem[] = (() => {
    const items: TimelineItem[] = [];

    const pushEvents = (list: typeof allEvents) => {
      for (const event of list) {
        items.push({
          kind: "event",
          id: event.id,
          at: event.fecha || "",
          event,
        });
      }
    };

    const pushHistorialExterno = () => {
      if (pipeline !== "operativa") return;
      for (const [idx, nota] of historialExterno.entries()) {
        items.push({
          kind: "externo",
          id: `ext-${nota.fecha}-${idx}`,
          at: nota.fecha || "",
          nota,
        });
      }
    };

    const isTarea = (e: CaseEventRow) =>
      (e.tipo || "").toLowerCase().includes("tarea");

    if (pipeline === "operativa") {
      // Temprana/Media: SOLO eventos operativos (sin formal) + historial Oracle
      switch (activeBitacoraTab) {
        case "comunicaciones":
          pushEvents(
            operativaEvents.filter(
              (e) =>
                [
                  "llamada",
                  "mensaje",
                  "whatsapp",
                  "recordatorio",
                  "notificacion",
                  "visita_cortesia",
                  "email",
                ].includes(operativaDisplayTipo(e).toLowerCase()) ||
                CANALES_COMUNICACION.has((e.canal || "").toLowerCase()),
            ),
          );
          break;
        case "observaciones":
          pushEvents(operativaEvents.filter(isNotaEvent));
          pushHistorialExterno();
          break;
        case "tareas":
          pushEvents(operativaEvents.filter(isTarea));
          break;
        case "sistema":
          pushEvents(operativaEvents.filter(isPureSistemaEvent));
          break;
        default:
          pushEvents(operativaEvents);
          pushHistorialExterno();
          break;
      }
    } else {
      // Formal: SOLO gestiones formales + saltos
      switch (activeBitacoraTab) {
        case "gestiones":
          pushEvents(formalEvents);
          break;
        case "saltos":
          for (const skip of data.step_skips ?? []) {
            items.push({
              kind: "skip",
              id: skip.id,
              at: skip.created_at,
              skip,
            });
          }
          break;
        case "observaciones":
          pushEvents(allEvents.filter(isNotaEvent));
          break;
        case "sistema":
          pushEvents(allEvents.filter(isPureSistemaEvent));
          break;
        default:
          pushEvents(formalEvents);
          break;
      }
    }

    items.sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return tb - ta;
    });
    return items;
  })();

  const closePanel = () => {
    setPanel("bitacora");
    setSelectedTipo(undefined);
    setSkipWarning(null);
  };

  const startGestion = () => {
    setSelectedTipo(undefined);
    setSkipWarning(null);
    setPanel("pickTipo");
  };

  /** Misma apertura de formulario para needsWarning=false y post register-skip. */
  const openStepForm = (tipo: string) => {
    setSkipWarning(null);
    setCheckingSkip(false);
    setSelectedTipo(tipo);
    setPanel("gestion");
  };

  const pickTipo = async (tipo: string) => {
    if (pipeline !== "formal") {
      openStepForm(tipo);
      return;
    }

    if (!canAccessStep(tipo, poder)) return;
    if (checkingSkip || skipWarning) return;

    setCheckingSkip(true);
    try {
      // Solo consulta: NUNCA registra salto aquí
      const check = await legalCasesService.checkStepSkip({
        case_id: c.id,
        stepKey: tipo,
        events: data.events ?? [],
      });
      if (!check.needsWarning) {
        openStepForm(tipo);
        return;
      }
      setPanel("bitacora");
      setSkipWarning({ stepKey: tipo, skippedSteps: check.skippedSteps });
    } catch (e: any) {
      alert(e?.message || "No se pudo validar el paso");
    } finally {
      setCheckingSkip(false);
    }
  };

  const handleConfirmSkip = async (input: {
    motivo: SkipMotivo;
    detalle_texto?: string;
  }) => {
    if (!skipWarning) return;
    const stepKey = skipWarning.stepKey;
    const skippedSteps = skipWarning.skippedSteps;
    const result = await legalCasesService.registerStepSkip({
      case_id: c.id,
      stepKey,
      motivo: input.motivo,
      detalle_texto: input.detalle_texto,
      skippedSteps,
    });
    if (!result.ok) {
      throw new Error("No se pudo registrar el salto");
    }
    // Abrir form ANTES del refresh; refresh es silencioso (no desmonta)
    openStepForm(stepKey);
    await onRefresh();
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!confirm("¿Marcar esta tarea como completada?")) return;
    setIsCompletingTask(taskId);
    try {
      await legalCasesService.completeTask({
        task_id: taskId,
        event_descripcion: "Tarea marcada como completada manualmente",
      });
      await onRefresh();
    } catch (e: any) {
      alert(e?.message || "Error al completar la tarea");
    } finally {
      setIsCompletingTask(null);
    }
  };

  if (panel === "status") {
    return (
      <ChangeStatusForm
        caseData={c}
        operativeOnly={operativeOnly}
        requireFormalGates={requireFormalGates}
        onCancel={closePanel}
        onSuccess={async () => {
          closePanel();
          await onRefresh();
        }}
      />
    );
  }

  if (panel === "process") {
    return (
      <ChangeProcessForm
        caseData={c}
        onCancel={closePanel}
        onSuccess={async () => {
          closePanel();
          await onRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header como antes: info | próxima acción | acciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row relative z-10">
        <div className="flex-1 p-5 md:p-6 border-b md:border-b-0 md:border-r border-slate-100 relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900" />
          <div className="pl-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      c.estado === "nuevo"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : c.estado === "gestionando"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : c.estado === "pre_judicial"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : c.estado === "judicial"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : c.estado === "cerrado"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    ● Estado: {c.estado?.replace("_", " ")}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                      c.riesgo === "alto"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : c.riesgo === "medio"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    Riesgo {c.riesgo}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {legalContext.type === "oracle" ? (
                    <>Expediente #{c.id_sistema}</>
                  ) : (
                    <>
                      Cartera manual ·{" "}
                      <span className="font-mono text-lg">
                        {c.cartera_manual_id?.slice(0, 8)}…
                      </span>
                    </>
                  )}
                </h3>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full sm:w-64 shrink-0">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                  <CalendarClock className="h-4 w-4 text-slate-700" />
                  Próxima acción requerida
                </div>
                <div className="text-sm font-bold text-slate-900 leading-snug">
                  {c.proxima_accion || "—"}
                </div>
                <div className="text-xs text-slate-600 font-mono mt-2 bg-white px-2 py-1 border border-slate-200 rounded inline-block">
                  {c.fecha_proxima_accion
                    ? new Date(c.fecha_proxima_accion).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                {
                  icon: Scale,
                  label: "Tipo proceso",
                  value: c.tipo_proceso?.replace("_", " "),
                },
                {
                  icon: Target,
                  label: "Objetivo",
                  value: c.objetivo_caso?.replace("_", " "),
                },
                {
                  icon: Car,
                  label: "Vehículo",
                  value: labelEstadoVehiculo(c.estado_vehiculo),
                },
                {
                  icon: Banknote,
                  label: "Intención pago",
                  value: c.intencion_pago,
                },
                {
                  icon: PhoneOff,
                  label: "Contactabilidad",
                  value: c.contactabilidad?.replace("_", " "),
                },
                { icon: Activity, label: "Prioridad", value: c.prioridad },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <item.icon className="h-3 w-3" /> {item.label}
                  </div>
                  <div className="text-sm font-semibold text-slate-800 capitalize">
                    {item.value || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Acciones del expediente — como antes */}
        <div className="w-full md:w-64 bg-slate-50 p-5 flex flex-col justify-center gap-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">
            Acciones del expediente
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={startGestion}
              className="w-full h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
            >
              <Plus className="h-4 w-4" />
              Añadir Gestión
            </button>
            {panel === "pickTipo" && (
              <>
                <button
                  type="button"
                  aria-label="Cerrar"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={closePanel}
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <GestionStepList
                    variant="menu"
                    pipeline={pipeline}
                    events={pipeline === "formal" ? formalEvents : []}
                    poderEspecial={poder}
                    selectedTipo={selectedTipo}
                    onSelect={pickTipo}
                  />
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPanel("observacion")}
            className="w-full h-11 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Añadir Observación
          </button>
          <button
            type="button"
            onClick={() => setPanel("status")}
            className="w-full h-11 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-sm font-semibold flex items-center justify-center gap-2"
          >
            <History className="h-4 w-4" />
            Cambiar Estado
          </button>
          <button
            type="button"
            onClick={() => setPanel("process")}
            className="w-full h-11 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Scale className="h-4 w-4" />
            Cambiar Proceso
          </button>
        </div>
      </div>

      {/* Bitácora siempre visible; formulario en ventana flotante */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[560px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {pipeline === "operativa"
                      ? "Bitácora de Gestiones"
                      : activeBitacoraTab === "gestiones"
                        ? "Historial de gestiones"
                        : activeBitacoraTab === "saltos"
                          ? "Historial de saltos"
                          : activeBitacoraTab === "observaciones"
                            ? "Historial de observaciones"
                            : "Historial del sistema"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {pipeline === "operativa"
                      ? "Cobranza temprana y media"
                      : activeBitacoraTab === "gestiones"
                        ? "Registros de «Añadir Gestión»"
                        : activeBitacoraTab === "saltos"
                          ? "Pasos omitidos con motivo registrado"
                          : activeBitacoraTab === "observaciones"
                            ? "Notas de «Añadir Observación»"
                            : "Creación y cambios automáticos"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-600">
                {timelineItems.length}
                {pipeline === "operativa" ? " eventos" : ""}
              </span>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-2 overflow-x-auto">
              {bitacoraTabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBitacoraTab(id)}
                  className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider relative shrink-0 ${
                    activeBitacoraTab === id
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                  {activeBitacoraTab === id && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-slate-50/30">
              {timelineItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <MessageCircle className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">
                    No hay registros en{" "}
                    {pipeline === "operativa"
                      ? "esta categoría"
                      : "este historial"}
                    .
                  </p>
                  <p className="text-xs text-center max-w-xs">
                    {pipeline === "operativa"
                      ? "Usa «Añadir Gestión» en el expediente."
                      : activeBitacoraTab === "gestiones"
                        ? "Usa «Añadir Gestión» para registrar un paso."
                        : activeBitacoraTab === "saltos"
                          ? "Aquí aparecerán los saltos de paso cuando se omita uno."
                          : activeBitacoraTab === "observaciones"
                            ? "Usa «Añadir Observación» para dejar una nota."
                            : "Sin eventos en esta categoría."}
                  </p>
                </div>
              ) : pipeline === "operativa" ? (
                <div className="relative space-y-4">
                  {timelineItems.map((item) => {
                    if (item.kind === "externo") {
                      return (
                        <HistorialExternoCard
                          key={item.id}
                          nota={item.nota}
                        />
                      );
                    }
                    if (item.kind !== "event") return null;
                    return (
                      <OperativaEventCard
                        key={item.event.id}
                        event={item.event}
                        actors={data.actors}
                      />
                    );
                  })}
                </div>
              ) : (
                timelineItems.map((item) => {
                  if (item.kind === "skip") {
                    const s = item.skip;
                    const motivoLabel =
                      SKIP_MOTIVO_LABELS[s.motivo as SkipMotivo] || s.motivo;
                    return (
                      <div
                        key={`skip-${s.id}`}
                        className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b bg-amber-50 border-amber-100 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-amber-900">
                            Salto de paso
                          </span>
                          <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {s.created_at
                              ? new Date(s.created_at).toLocaleString()
                              : "—"}
                          </span>
                        </div>
                        <div className="p-4 space-y-2">
                          <p className="text-sm font-semibold text-slate-800">
                            Se avanzó a «{formalStepLabel(s.step_ejecutado)}»
                            sin completar «{formalStepLabel(s.step_saltado)}»
                          </p>
                          <p className="text-xs text-slate-600">
                            Motivo: {motivoLabel}
                            {s.detalle_texto ? ` — ${s.detalle_texto}` : ""}
                          </p>
                          <div className="flex justify-end pt-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <UserCircle className="h-3.5 w-3.5" />
                              {lineaRegistrante(data.actors, s.usuario_id) ||
                                "Sistema"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const e = item.event;
                  return (
                    <div
                      key={e.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b bg-blue-50/50 border-blue-100 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide text-blue-800">
                          {e.tipo?.replace(/_/g, " ") || "evento"}
                          {e.canal ? ` · ${e.canal}` : ""}
                        </span>
                        <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {e.fecha ? new Date(e.fecha).toLocaleString() : "—"}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {e.descripcion || "—"}
                        </p>
                        {e.detalle && <EventDetalleView detalle={e.detalle} />}
                        <EventAdjuntosView
                          documentoId={e.documento_id}
                          imagenesIds={e.imagenes_ids}
                        />
                        <div className="flex items-center justify-between pt-1">
                          {e.resultado ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                              {e.resultado}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <UserCircle className="h-3.5 w-3.5" />
                            {lineaRegistrante(data.actors, e.usuario_id) ||
                              "Sistema"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[560px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/30 rounded-t-xl">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-amber-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Tareas / Checklists
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {data.tasks_pending?.length ?? 0} pendientes
              </span>
            </div>
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              {!isAddingTask ? (
                <button
                  type="button"
                  onClick={() => setIsAddingTask(true)}
                  className="w-full text-xs font-semibold text-slate-600 bg-white border border-slate-200 border-dashed rounded-lg py-2 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva tarea
                </button>
              ) : (
                <AddTaskForm
                  caseId={c.id}
                  onCancel={() => setIsAddingTask(false)}
                  onSuccess={async () => {
                    setIsAddingTask(false);
                    await onRefresh();
                  }}
                />
              )}
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-2">
              {(data.tasks_pending ?? []).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-4">
                  <CheckCircle2 className="h-8 w-8 opacity-20 text-emerald-500" />
                  <p className="text-xs text-center">Sin tareas pendientes.</p>
                </div>
              ) : (
                (data.tasks_pending ?? []).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 flex items-start gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(t.id)}
                      disabled={isCompletingTask === t.id}
                      className="mt-0.5 shrink-0 h-5 w-5 rounded border-2 border-slate-300 flex items-center justify-center hover:border-emerald-500"
                    >
                      {isCompletingTask === t.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                      ) : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">
                        {t.tipo || "tarea"}
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        {t.descripcion || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.fecha_limite
                          ? new Date(t.fecha_limite).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
      </div>

      {panel === "gestion" && selectedTipo && (
        <ModalShell onClose={closePanel}>
          <AddEventForm
            key={`g-${pipeline}-${selectedTipo}`}
            caseId={c.id}
            pipeline={pipeline}
            poderEspecialHint={poder}
            initialTipo={selectedTipo}
            lockTipo
            onBack={() => {
              setSelectedTipo(undefined);
              setSkipWarning(null);
              setPanel("pickTipo");
            }}
            onCancel={closePanel}
            onSuccess={async () => {
              closePanel();
              await onRefresh();
            }}
          />
        </ModalShell>
      )}

      {skipWarning && (
        <SkipStepWarningModal
          skippedSteps={skipWarning.skippedSteps}
          onCancel={() => {
            // Cancelar NO registra salto
            setSkipWarning(null);
            setPanel("pickTipo");
          }}
          onConfirm={handleConfirmSkip}
        />
      )}

      {checkingSkip && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/20">
          <div className="rounded-xl bg-white px-4 py-3 shadow-lg flex items-center gap-2 text-sm text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validando paso…
          </div>
        </div>
      )}

      {panel === "observacion" && (
        <ModalShell onClose={closePanel}>
          <AddEventForm
            caseId={c.id}
            mode="observacion"
            onCancel={closePanel}
            onSuccess={async () => {
              closePanel();
              await onRefresh();
            }}
          />
        </ModalShell>
      )}
    </div>
  );
}
