"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  KeyRound,
  LayoutGrid,
  Loader2,
  Pin,
  RefreshCw,
  Scale,
  ShieldCheck,
  Table2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { docCatalogByType, VEHICLE_DOCUMENT_CATALOG } from "@/lib/inventario/vehicleDocumentCatalog";
import {
  getCatalogDocumentRow,
  getDocumentCheckStatus,
  isDocumentImageFile,
  isDocumentPdfFile,
  listDocumentFiles,
  statusLabel,
} from "@/lib/inventario/vehicleLegalUi";
import {
  buildContrastMatrix,
  CONTRASTE_OFICIAL_DOC_TYPES,
  contrastShowAmt,
  contrasteTopicDetail,
  formatContrasteConsultedAt,
  formatContrasteConsultedPretty,
  formatContrasteRelative,
  sriRubros,
  summarizeMatrix,
  citationStatusClass,
  citationStatusLabel,
  citationStatusCardClass,
  citationAmountClass,
  citationHistorySectionTitle,
  groupItemsByCitationStatus,
  type ContrastStaffByDoc,
  type ContrastResultKind,
  type ContrasteEstadoGeneral,
  type ContrastMatrixRow,
  type ContrastePendienteLine,
  type EcuadorContrastePayload,
} from "@/lib/inventario/ecuadorContraste";
import {
  listContrasteConsultas,
  payloadFromConsulta,
  saveContrasteConsulta,
  type ContrasteConsultaRow,
} from "@/services/contrasteConsultas.service";
import type {
  VehicleDocType,
  VehicleDocumentFileRow,
  VehicleDocumentRow,
  VehicleFineRow,
} from "@/types/vehicleLegal.types";
import type { Json } from "@/types/supabase";

type ContrasteView = "cards" | "table";
type StaffTone = ReturnType<typeof getDocumentCheckStatus>;
type ResultKind = ContrastResultKind;

const CONTRASTE_VIEW_STORAGE_KEY = "ksi.contrasteOficial.view";

function readStoredContrasteView(): ContrasteView {
  try {
    const value = localStorage.getItem(CONTRASTE_VIEW_STORAGE_KEY);
    if (value === "table" || value === "cards") return value;
  } catch {
    /* ignore */
  }
  return "cards";
}

function checklistLabel(status: StaffTone, extra?: string | null): string {
  if (status === "na") return "—";
  if (status === "ok") return extra ? `Sí · ${extra}` : "Sí / al día";
  if (status === "warn") return extra ? `Pendiente · ${extra}` : "Pendiente";
  return extra ? `No · ${extra}` : "No / no revisado";
}

function formatExpiry(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  try {
    return new Date(`${expiresAt}T12:00:00`).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return expiresAt;
  }
}

function sourceTextClass(kind: ResultKind): string {
  if (kind === "ok") return "text-emerald-600 font-medium";
  if (kind === "missing") return "text-red-600 font-medium";
  if (kind === "warn") return "text-amber-700 font-medium";
  return "text-slate-400";
}

function topicIcon(key: string) {
  if (key === "matricula") return Calendar;
  if (key === "revision_tecnica") return ClipboardCheck;
  if (key === "informe_ant_siat" || key === "procesos_legales") return Scale;
  if (key === "prenda_industrial" || key === "levantamiento_prendas") return Pin;
  if (key === "poder_contrato" || key === "contrato_interno") return FileText;
  if (key === "accesorios_llaves") return KeyRound;
  if (key === "documentos_pendientes") return AlertTriangle;
  return ShieldCheck;
}

function isCatalogDocType(key: string): key is VehicleDocType {
  return VEHICLE_DOCUMENT_CATALOG.some((item) => item.docType === key);
}

function topicSources(row: ContrastMatrixRow) {
  const antLabel = row.key === "procesos_legales" ? "Función Judicial" : "ANT"
  return [
    { label: "SRI", text: row.sri.text, kind: row.sri.kind },
    { label: antLabel, text: row.ant.text, kind: row.ant.kind },
    { label: "AMT", text: row.amt.text, kind: row.amt.kind },
  ].filter((s) => s.text && s.text !== "—" && s.kind !== "idle")
}

function EncargadoFotoCell({
  doc,
  onOpenPhoto,
}: {
  doc?: VehicleDocumentRow
  onOpenPhoto: (files: VehicleDocumentFileRow[], title: string) => void
}) {
  const files = doc ? listDocumentFiles(doc) : []
  const detail = doc?.detail_text?.trim()
  if (files.length > 0) {
    return (
      <button
        type="button"
        className="text-blue-700 font-semibold hover:underline text-left"
        onClick={(e) => {
          e.stopPropagation()
          onOpenPhoto(files, doc?.file_name || files[0]?.file_name || "Foto")
        }}
      >
        Foto subida
      </button>
    )
  }
  return (
    <span className="text-slate-600">
      Sin foto
      {detail ? <span className="block text-[11px] font-normal text-slate-500 mt-0.5">{detail}</span> : null}
    </span>
  )
}

function matrixCellClass(kind: ResultKind): string {
  if (kind === "ok") return "text-emerald-700";
  if (kind === "missing") return "text-red-700 font-semibold";
  if (kind === "warn") return "text-amber-700";
  return "text-slate-400";
}

function TopicCard({
  row,
  doc,
  onOpen,
  onOpenPhoto,
}: {
  row: ContrastMatrixRow
  doc?: VehicleDocumentRow
  onOpen: () => void
  onOpenPhoto: (files: VehicleDocumentFileRow[], title: string) => void
}) {
  const Icon = topicIcon(row.key);
  const sources = topicSources(row);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left w-full hover:border-blue-300 hover:shadow-md transition-all">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-start justify-between gap-2 mb-3 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-700">
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold text-slate-900">{row.label}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-2" />
      </button>
      <dl className="space-y-2">
        <div className="flex items-start justify-between gap-3 text-xs">
          <dt className="text-slate-400 shrink-0">Encargado</dt>
          <dd className="text-right">
            <EncargadoFotoCell doc={doc} onOpenPhoto={onOpenPhoto} />
          </dd>
        </div>
        {sources.map((s) => (
          <div key={s.label} className="flex items-start justify-between gap-3 text-xs">
            <dt className="text-slate-400 shrink-0">{s.label}</dt>
            <dd className={`text-right ${sourceTextClass(s.kind)}`}>{s.text}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function formatYearRange(from: number | null, to: number | null): string | null {
  if (from && to && from !== to) return `${from}–${to}`;
  if (from || to) return String(from || to);
  return null;
}

function PendienteLineCard({ line }: { line: ContrastePendienteLine }) {
  const year = formatYearRange(line.yearFrom, line.yearTo);
  const meta = [
    line.source,
    line.beneficiary && line.beneficiary !== line.source ? line.beneficiary : null,
    line.citationNumber ? `N.º ${line.citationNumber}` : null,
    year,
    line.date,
    line.dueDate ? `vence ${line.dueDate}` : null,
    line.location,
  ].filter(Boolean);

  return (
    <li className={`rounded-xl border px-4 py-3 ${citationStatusCardClass(line.status)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{line.description}</p>
          {line.infraction && line.infraction !== line.description ? (
            <p className="text-xs text-slate-700 mt-1">{line.infraction}</p>
          ) : null}
          {line.article ? <p className="text-[11px] text-slate-500 mt-0.5">{line.article}</p> : null}
          {meta.length > 0 ? <p className="text-[11px] text-slate-500 mt-1">{meta.join(" · ")}</p> : null}
        </div>
        <p className={`text-sm font-bold whitespace-nowrap ${citationAmountClass(line.status)}`}>
          ${line.amount.toFixed(2)}
        </p>
      </div>
    </li>
  );
}

function TopicDetailPanel({
  row,
  payload,
  documents,
  fines,
  onClose,
  onOpenPhoto,
}: {
  row: ContrastMatrixRow;
  payload: EcuadorContrastePayload | null;
  documents: VehicleDocumentRow[];
  fines: VehicleFineRow[];
  onClose: () => void;
  onOpenPhoto: (files: VehicleDocumentFileRow[], title: string) => void;
}) {
  const Icon = topicIcon(row.key);
  const sources = topicSources(row);
  const detail = contrasteTopicDetail(payload, row.key);
  const docType = isCatalogDocType(row.key) ? row.key : undefined;
  const byType = new Map(documents.map((d) => [d.doc_type, d]));
  const staffDoc = docType ? getCatalogDocumentRow(byType, docType) : undefined;
  const staffFines = row.key === "informe_ant_siat" ? fines : [];
  const linesTotal = detail.lines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contraste-topic-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <span className="h-10 w-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p id="contraste-topic-title" className="text-base font-bold text-slate-900">
                {row.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto overscroll-contain min-h-0 p-5 space-y-5">
          <section>
            <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Resumen</h5>
            <dl className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              <div className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <dt className="text-slate-500">Encargado</dt>
                <dd className="text-right">
                  <EncargadoFotoCell doc={staffDoc} onOpenPhoto={onOpenPhoto} />
                </dd>
              </div>
              {sources.map((s) => (
                <div key={s.label} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                  <dt className="text-slate-500">{s.label}</dt>
                  <dd className={`text-right ${sourceTextClass(s.kind)}`}>{s.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          {detail.facts.length > 0 ? (
            <section>
              <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Datos oficiales</h5>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detail.facts.map((fact) => (
                  <div key={fact.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <dt className="text-[11px] text-slate-500">{fact.label}</dt>
                    <dd className="text-sm font-semibold text-slate-900 mt-0.5">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {row.key === "informe_ant_siat" ? (
            detail.lines.length > 0 ? (
              groupItemsByCitationStatus(detail.lines).map((group) => (
                <section key={group.status}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h5 className="text-sm font-bold text-slate-900">
                      {citationHistorySectionTitle(group.status)}
                    </h5>
                    <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${citationStatusClass(group.status)}`}>
                      {citationStatusLabel(group.status)} · {group.items.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((line, i) => (
                      <PendienteLineCard key={`${line.citationNumber || line.description}-${i}`} line={line} />
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <section>
                <h5 className="text-sm font-bold text-slate-900 mb-2">Historial de citaciones ANT</h5>
                <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 px-3 py-4">
                  {detail.emptyHint}
                </p>
              </section>
            )
          ) : (
            <section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400">Desglose oficial</h5>
                {detail.lines.length > 0 ? (
                  <p className="text-xs font-semibold text-red-700">
                    {detail.lines.length} ítem{detail.lines.length === 1 ? "" : "s"}
                    {linesTotal > 0 ? ` · $${linesTotal.toFixed(2)}` : ""}
                  </p>
                ) : null}
              </div>
              {detail.lines.length > 0 ? (
                <ul className="space-y-2">
                  {detail.lines.map((line, i) => (
                    <PendienteLineCard key={`${line.citationNumber || line.description}-${i}`} line={line} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 px-3 py-4">
                  {detail.emptyHint}
                </p>
              )}
            </section>
          )}

          {staffDoc ? (
            <section>
              <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Cargado por el encargado</h5>
              <div className="rounded-xl border border-slate-200 px-3 py-3 text-sm space-y-1">
                <p>
                  <span className="text-slate-500">Estado: </span>
                  <span className="font-semibold text-slate-900">{statusLabel(staffDoc.status)}</span>
                </p>
                {staffDoc.expires_at ? (
                  <p>
                    <span className="text-slate-500">Vence: </span>
                    {formatExpiry(staffDoc.expires_at)}
                  </p>
                ) : null}
                {staffDoc.detail_text ? <p className="text-slate-700">{staffDoc.detail_text}</p> : null}
                {staffDoc.file_name ? <p className="text-xs text-slate-500">Archivo: {staffDoc.file_name}</p> : null}
              </div>
            </section>
          ) : null}

          {staffFines.length > 0 ? (
            <section>
              <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Multas registradas internamente</h5>
              <ul className="space-y-2">
                {staffFines.map((fine) => (
                  <li key={fine.id} className="rounded-xl border border-slate-200 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{fine.title}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {[fine.status, fine.fine_date, fine.location].filter(Boolean).join(" · ")}
                        </p>
                        {fine.payer_notes ? <p className="text-xs text-slate-600 mt-1">{fine.payer_notes}</p> : null}
                      </div>
                      <p className="text-sm font-bold text-slate-800">${fine.amount.toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Props = {
  placa: string;
  inventoryoracleId: string | null;
  documents: VehicleDocumentRow[];
  fines: VehicleFineRow[];
  linked: boolean;
  trigger?: "header" | "bar";
  reloadKey?: number;
  latestPayload?: EcuadorContrastePayload | null;
  onConsultaSaved?: (payload: EcuadorContrastePayload) => void;
};

export function ContrasteOficialBlock({
  placa,
  inventoryoracleId,
  documents,
  fines,
  linked,
  trigger = "header",
  reloadKey = 0,
  latestPayload = null,
  onConsultaSaved,
}: Props) {
  const { supabase, user, profile } = useAuth();
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<EcuadorContrastePayload | null>(null);
  const [history, setHistory] = useState<ContrasteConsultaRow[]>([]);
  const [activeConsultaId, setActiveConsultaId] = useState<string | null>(null);
  const [liveConsulta, setLiveConsulta] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openTopicKey, setOpenTopicKey] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<{ files: VehicleDocumentFileRow[]; title: string; index: number } | null>(null);
  const [viewMode, setViewMode] = useState<ContrasteView>("cards");
  const [defaultView, setDefaultView] = useState<ContrasteView>("cards");
  const inFlight = useRef(false);

  useEffect(() => {
    const stored = readStoredContrasteView();
    setViewMode(stored);
    setDefaultView(stored);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const stored = readStoredContrasteView();
    setViewMode(stored);
    setDefaultView(stored);
  }, [modalOpen]);

  useEffect(() => {
    setPayload(null);
    setError(null);
    setHistory([]);
    setActiveConsultaId(null);
    setLiveConsulta(false);
    setModalOpen(false);
    setOpenTopicKey(null);
    setPhotoPreview(null);
    inFlight.current = false;
    let cancelled = false;

    void Promise.all([
      fetch("/api/inventario/contraste/ready")
        .then(async (res) => {
          if (!res.ok) return { ready: false };
          return (await res.json()) as { ready?: boolean };
        })
        .catch(() => ({ ready: false })),
      listContrasteConsultas(supabase, placa).catch(() => [] as ContrasteConsultaRow[]),
    ]).then(([readyRes, rows]) => {
      if (cancelled) return;
      setReady(Boolean(readyRes.ready));
      setHistory(rows);
      const latest = rows[0];
      if (latest) {
        const saved = payloadFromConsulta(latest);
        if (saved) {
          setPayload(saved);
          setActiveConsultaId(latest.id);
          setLiveConsulta(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placa, supabase]);

  useEffect(() => {
    if (reloadKey === 0) return;
    if (latestPayload) {
      setPayload(latestPayload);
      setLiveConsulta(false);
      setError(null);
    }
    let cancelled = false;
    void listContrasteConsultas(supabase, placa)
      .then((rows) => {
        if (cancelled) return;
        setHistory(rows);
        const latest = rows[0];
        if (!latest) return;
        const saved = payloadFromConsulta(latest);
        if (!saved) return;
        setPayload(saved);
        setActiveConsultaId(latest.id);
        setLiveConsulta(false);
      })
      .catch(() => {
        /* se mantiene el snapshot del informe IA */
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, placa, supabase, latestPayload]);

  const byType = new Map(documents.map((d) => [d.doc_type, d]));
  const pendingFines = fines.filter((f) => f.status === "pendiente").length;
  const visibleDocTypes = CONTRASTE_OFICIAL_DOC_TYPES;

  const staffByKey: ContrastStaffByDoc = {};
  for (const catalog of VEHICLE_DOCUMENT_CATALOG) {
    const doc = getCatalogDocumentRow(byType, catalog.docType);
    const status = linked ? getDocumentCheckStatus(doc, catalog) : "na";
    const expiry = catalog.docType === "matricula" ? formatExpiry(doc?.expires_at) : null;
    const statusTxt = doc ? statusLabel(doc.status) : null;
    staffByKey[catalog.docType] = {
      text: checklistLabel(status, expiry ?? statusTxt),
      status,
    };
  }
  {
    const catalog = docCatalogByType("informe_ant_siat");
    const doc = getCatalogDocumentRow(byType, "informe_ant_siat");
    const docStatus = linked && catalog ? getDocumentCheckStatus(doc, catalog) : "na";
    const informeText = checklistLabel(docStatus, doc ? statusLabel(doc.status) : null);
    const finesText =
      pendingFines > 0
        ? `${pendingFines} multa${pendingFines === 1 ? "" : "s"} interna${pendingFines === 1 ? "" : "s"} por pagar`
        : fines.length > 0
          ? "internas al día"
          : "sin pendientes internas";
    staffByKey.informe_ant_siat = {
      text: `${informeText} · ${finesText}`,
      status: !linked ? "na" : pendingFines > 0 ? "missing" : docStatus,
    };
  }

  const latest = history[0] ?? null;
  const activeConsulta = history.find((row) => row.id === activeConsultaId) ?? latest;
  const viewingOlder = Boolean(
    activeConsulta && latest && activeConsulta.id !== latest.id
  );

  const handleSelectConsulta = (row: ContrasteConsultaRow) => {
    const saved = payloadFromConsulta(row);
    if (!saved) {
      setError("Esa consulta no tiene datos para mostrar.");
      return;
    }
    setError(null);
    setPayload(saved);
    setActiveConsultaId(row.id);
    setLiveConsulta(false);
    setModalOpen(true);
  };
  const matrix = buildContrastMatrix(payload, staffByKey, { visibleDocTypes });

  const showAmt = contrastShowAmt(payload);
  const tableRows = matrix;

  const saveViewAsDefault = () => {
    try {
      localStorage.setItem(CONTRASTE_VIEW_STORAGE_KEY, viewMode);
      setDefaultView(viewMode);
      toast.success(viewMode === "table" ? "La vista de tabla quedó como predeterminada." : "La vista de tarjetas quedó como predeterminada.");
    } catch {
      toast.error("No se pudo guardar la vista predeterminada.");
    }
  };
  const sriTotal = payload?.sri ? sriRubros(payload.sri).total : 0;
  const summary = matrix
    ? summarizeMatrix(matrix, contrastShowAmt(payload))
    : latest
      ? {
          coinciden: latest.coinciden,
          diferencias: latest.diferencias,
          sinVerificar: latest.sin_verificar,
          estadoGeneral: latest.estado_general as ContrasteEstadoGeneral,
        }
      : null;

  const handleConsultar = async () => {
    const plate = placa.trim();
    if (!plate || loading || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventario/contraste/${encodeURIComponent(plate)}`, {
        method: "POST",
      });
      const body = (await res.json()) as { data?: EcuadorContrastePayload; error?: string };
      if (!res.ok) {
        setModalOpen(true);
        setError(body.error || `No se pudo consultar (${res.status})`);
        return;
      }
      if (!body.data) {
        setModalOpen(true);
        setError("Sin datos en la respuesta");
        return;
      }
      setPayload(body.data);
      setModalOpen(true);
      setLiveConsulta(true);
      const counts = summarizeMatrix(
        buildContrastMatrix(body.data, staffByKey, { visibleDocTypes }),
        contrastShowAmt(body.data)
      );
      try {
        const saved = await saveContrasteConsulta(supabase, {
          placa: plate,
          inventoryoracleId,
          payload: body.data,
          staffSnapshot: staffByKey as unknown as Json,
          coinciden: counts.coinciden,
          diferencias: counts.diferencias,
          sinVerificar: counts.sinVerificar,
          estadoGeneral: counts.estadoGeneral,
          consultedBy: profile?.id ?? null,
          consultedByName: profile?.full_name?.trim() || user?.email || "Usuario",
        });
        setActiveConsultaId(saved.id);
        setHistory((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)].slice(0, 100));
        onConsultaSaved?.(body.data);
      } catch (saveErr) {
        console.error(saveErr);
        setError("Consulta OK, pero no se pudo guardar el historial.");
      }
    } catch {
      setModalOpen(true);
      setError("No se pudo conectar con el servidor");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const openTopic = matrix.find((row) => row.key === openTopicKey) ?? null;

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (photoPreview) {
        setPhotoPreview(null)
        return
      }
      if (openTopicKey) {
        setOpenTopicKey(null)
        return
      }
      setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, openTopicKey, photoPreview])

  return (
    <>
      {trigger === "header" ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Contraste oficial
        </button>
      ) : (
        <div className="mx-4 md:mx-6 mb-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex-1 min-w-0 flex items-center gap-2.5 text-left rounded-lg px-1 py-1 hover:bg-slate-100/80 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Contraste oficial</p>
                {summary ? (
                  <p className="text-[11px] text-slate-500 truncate">
                    {latest ? `Última consulta ${formatContrasteConsultedAt(latest.created_at)}` : "Abrir para ver detalle e historial"}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 truncate">Abrir para ver detalle e historial</p>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
            >
              Ver
            </button>
          </div>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => {
            setPhotoPreview(null)
            setOpenTopicKey(null)
            setModalOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contraste-oficial-title"
            className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 bg-white border-b border-slate-100 shrink-0 flex-wrap">
              <div className="min-w-0">
                <p id="contraste-oficial-title" className="text-lg font-bold text-slate-900">
                  Contraste oficial
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {latest
                    ? `Última consulta: ${formatContrasteConsultedPretty(latest.created_at)}`
                    : "Aún no hay consultas para esta placa"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    aria-pressed={viewMode === "cards"}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold ${
                      viewMode === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Tarjetas
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    aria-pressed={viewMode === "table"}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold ${
                      viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Tabla
                  </button>
                </div>
                <button
                  type="button"
                  onClick={saveViewAsDefault}
                  disabled={viewMode === defaultView}
                  title="Abrir Contraste oficial siempre en esta vista"
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-default"
                >
                  <Pin className="h-3.5 w-3.5" />
                  {viewMode === defaultView ? "Vista por defecto" : "Dejar por defecto"}
                </button>
                {ready ? (
                  <button
                    type="button"
                    onClick={() => void handleConsultar()}
                    disabled={loading || !placa.trim()}
                    title="Consulta placa + SRI + historial ANT de multas (~$0.03; +$0.01 si es Quito/AMT)"
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Consultar nuevamente
                  </button>
                ) : (
                  <span className="inline-flex items-center h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                    {ready === null ? "Comprobando API…" : "Consulta no disponible"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpenTopicKey(null)
                    setPhotoPreview(null)
                    setModalOpen(false)
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                  aria-label="Cerrar contraste oficial"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-5">
              {payload && activeConsulta ? (
                <div
                  className={`text-xs rounded-xl px-3 py-2 border ${
                    viewingOlder
                      ? "text-indigo-900 bg-indigo-50 border-indigo-100"
                      : "text-blue-900 bg-blue-50 border-blue-200"
                  }`}
                >
                  <span className="font-semibold">
                    {viewingOlder ? "Consulta del historial · " : "Última consulta hecha · "}
                  </span>
                  {formatContrasteConsultedPretty(activeConsulta.created_at)}
                  {" · "}
                  {formatContrasteRelative(activeConsulta.created_at)}
                  {viewingOlder ? ". No es la más reciente de esta placa." : ""}
                </div>
              ) : null}

              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              {sriTotal > 0 ? (
                <p className="text-xs text-red-700 font-medium">SRI · total a pagar ${sriTotal.toFixed(2)}</p>
              ) : null}

              {viewMode === "cards" ? (
                payload ? (
                  <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {matrix.map((row) => (
                        <TopicCard
                          key={row.key}
                          row={row}
                          doc={isCatalogDocType(row.key) ? getCatalogDocumentRow(byType, row.key) : undefined}
                          onOpen={() => setOpenTopicKey(row.key)}
                          onOpenPhoto={(files, title) => setPhotoPreview({ files, title, index: 0 })}
                        />
                      ))}
                    </div>
                  </section>
                ) : null
              ) : payload ? (
                <section>
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Fuentes consultadas</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2.5">Dato</th>
                          <th className="px-3 py-2.5">Encargado</th>
                          <th className="px-3 py-2.5">SRI</th>
                          <th className="px-3 py-2.5">ANT</th>
                          {showAmt ? <th className="px-3 py-2.5">AMT</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row) => (
                          <tr
                            key={row.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => setOpenTopicKey(row.key)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                setOpenTopicKey(row.key)
                              }
                            }}
                            className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-blue-50/70 transition-colors focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                          >
                            <td className="px-3 py-2.5 font-semibold text-slate-800">{row.label}</td>
                            <td className="px-3 py-2.5">
                              <EncargadoFotoCell
                                doc={isCatalogDocType(row.key) ? getCatalogDocumentRow(byType, row.key) : undefined}
                                onOpenPhoto={(files, title) => setPhotoPreview({ files, title, index: 0 })}
                              />
                            </td>
                            <td className={`px-3 py-2.5 ${matrixCellClass(row.sri.kind)}`}>{row.sri.text}</td>
                            <td className={`px-3 py-2.5 ${matrixCellClass(row.ant.kind)}`}>{row.ant.text}</td>
                            {showAmt ? (
                              <td className={`px-3 py-2.5 ${matrixCellClass(row.amt.kind)}`}>{row.amt.text}</td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {!payload ? (
                <p className="text-sm text-slate-500">
                  Pulsa Consultar nuevamente para traer SRI, historial de multas ANT y matrícula (~$0.03).
                </p>
              ) : null}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900">Historial de consultas</h4>
                </div>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Aún no hay consultas. Usa Consultar nuevamente para registrar la primera.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((row) => {
                      const selected = row.id === activeConsultaId;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectConsulta(row)}
                            className={`w-full flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-3 text-left text-xs transition-colors ${
                              selected
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium min-w-[10rem]">
                              <Calendar className="h-3.5 w-3.5 text-blue-600" />
                              {formatContrasteConsultedPretty(row.created_at)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600 min-w-[7rem]">
                              <User className="h-3.5 w-3.5 text-blue-600" />
                              {row.consulted_by_name || "—"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600 flex-1 min-w-[10rem]">
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              {row.diferencias} diferencia{row.diferencias === 1 ? "" : "s"} · {row.coinciden}{" "}
                              coincidencia{row.coinciden === 1 ? "" : "s"}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-blue-600 font-semibold ml-auto">
                              Revisar
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {openTopic ? (
              <TopicDetailPanel
                row={openTopic}
                payload={payload}
                documents={documents}
                fines={fines}
                onClose={() => setOpenTopicKey(null)}
                onOpenPhoto={(files, title) => setPhotoPreview({ files, title, index: 0 })}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {photoPreview ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPhotoPreview(null)}
              className="absolute -top-2 right-0 text-white hover:text-slate-200 p-2"
              aria-label="Cerrar foto"
            >
              <X className="h-6 w-6" />
            </button>
            {(() => {
              const current = photoPreview.files[photoPreview.index]
              if (!current) return null
              if (isDocumentImageFile(current)) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.file_url} alt={current.file_name} className="max-h-[85vh] max-w-full object-contain rounded-lg" />
                )
              }
              if (isDocumentPdfFile(current)) {
                return (
                  <iframe
                    src={current.file_url}
                    title={current.file_name}
                    className="w-full h-[80vh] rounded-lg bg-white"
                  />
                )
              }
              return (
                <a href={current.file_url} target="_blank" rel="noreferrer" className="text-white underline">
                  Abrir {current.file_name}
                </a>
              )
            })()}
            {photoPreview.files.length > 1 ? (
              <div className="mt-3 flex gap-2">
                {photoPreview.files.map((file, i) => (
                  <button
                    key={file.id ?? `${file.file_url}-${i}`}
                    type="button"
                    onClick={() => setPhotoPreview((prev) => (prev ? { ...prev, index: i } : prev))}
                    className={`text-xs px-2 py-1 rounded ${
                      i === photoPreview.index ? "bg-white text-slate-900" : "bg-white/20 text-white"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
