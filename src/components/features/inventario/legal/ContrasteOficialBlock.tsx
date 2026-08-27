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
  HelpCircle,
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
  filterVisibleCatalogItems,
  getCatalogDocumentRow,
  getDocumentCheckStatus,
  statusLabel,
} from "@/lib/inventario/vehicleLegalUi";
import {
  buildContrastMatrix,
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
import type { VehicleDocType, VehicleDocumentRow, VehicleFineRow } from "@/types/vehicleLegal.types";
import type { Json } from "@/types/supabase";

type TopicFilter = "all" | "ok" | "missing" | "unverified";
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

function encargadoKind(text: string): ResultKind {
  if (!text || text === "—") return "idle";
  if (/^Sí/i.test(text) || /al día/i.test(text) || /sin pendientes/i.test(text)) return "ok";
  if (/Pendiente|No \/|No ·/i.test(text)) return "missing";
  return "warn";
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
  return [
    { label: "Encargado", text: row.encargado, kind: encargadoKind(row.encargado) },
    { label: "SRI", text: row.sri.text, kind: row.sri.kind },
    { label: "ANT", text: row.ant.text, kind: row.ant.kind },
    { label: "AMT", text: row.amt.text, kind: row.amt.kind },
  ].filter((s) => s.text && s.text !== "—" && s.kind !== "idle");
}

function resultadoBadgeClass(kind: ResultKind): string {
  if (kind === "ok") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (kind === "missing") return "bg-red-50 text-red-700 border-red-200";
  if (kind === "warn") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function matrixCellClass(kind: ResultKind): string {
  if (kind === "ok") return "text-emerald-700";
  if (kind === "missing") return "text-red-700 font-semibold";
  if (kind === "warn") return "text-amber-700";
  return "text-slate-400";
}

function topicBadge(row: ContrastMatrixRow) {
  const isDiff = row.resultado.kind === "missing";
  const isOk = row.resultado.kind === "ok";
  if (isOk) return { label: "Coincide", className: "bg-emerald-50 text-emerald-700" };
  if (isDiff) return { label: "Revisar", className: "bg-orange-500 text-white" };
  return { label: "Sin verificar", className: "bg-slate-100 text-slate-600" };
}

function TopicCard({ row, onOpen }: { row: ContrastMatrixRow; onOpen: () => void }) {
  const Icon = topicIcon(row.key);
  const isDiff = row.resultado.kind === "missing";
  const isOk = row.resultado.kind === "ok";
  const badge = topicBadge(row);
  const iconWrap = isDiff ? "bg-red-50 text-red-600" : isOk ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500";
  const sources = topicSources(row);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left w-full hover:border-blue-300 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${iconWrap}`}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold text-slate-900">{row.label}</p>
        </div>
        <span className="inline-flex items-center gap-1 shrink-0">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </span>
      </div>
      <dl className="space-y-2">
        {sources.map((s) => (
          <div key={s.label} className="flex items-start justify-between gap-3 text-xs">
            <dt className="text-slate-400 shrink-0">{s.label}</dt>
            <dd className={`text-right ${sourceTextClass(s.kind)}`}>{s.text}</dd>
          </div>
        ))}
      </dl>
    </button>
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
}: {
  row: ContrastMatrixRow;
  payload: EcuadorContrastePayload | null;
  documents: VehicleDocumentRow[];
  fines: VehicleFineRow[];
  onClose: () => void;
}) {
  const Icon = topicIcon(row.key);
  const badge = topicBadge(row);
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
              <span className={`inline-flex mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>
                {badge.label}
              </span>
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
};

export function ContrasteOficialBlock({
  placa,
  inventoryoracleId,
  documents,
  fines,
  linked,
  trigger = "header",
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
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");
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
    setTopicFilter("all");
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

  const byType = new Map(documents.map((d) => [d.doc_type, d]));
  const pendingFines = fines.filter((f) => f.status === "pendiente").length;
  const visibleDocTypes = filterVisibleCatalogItems(VEHICLE_DOCUMENT_CATALOG, byType).map((item) => item.docType);

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
  const differenceRows = matrix.filter((row) => row.resultado.kind === "missing");
  const matchRows = matrix.filter((row) => row.resultado.kind === "ok");
  const unverifiedRows = matrix.filter(
    (row) => row.resultado.kind === "warn" || row.resultado.kind === "idle"
  );

  const toggleTopicFilter = (next: TopicFilter) => {
    setTopicFilter((current) => (current === next ? "all" : next));
  };

  const showDifferences = topicFilter === "all" || topicFilter === "missing";
  const showMatches = topicFilter === "all" || topicFilter === "ok";
  const showUnverified = topicFilter === "all" || topicFilter === "unverified";
  const showAmt = contrastShowAmt(payload);
  const tableRows = matrix.filter((row) => {
    if (topicFilter === "all") return true;
    if (topicFilter === "ok") return row.resultado.kind === "ok";
    if (topicFilter === "missing") return row.resultado.kind === "missing";
    return row.resultado.kind === "warn" || row.resultado.kind === "idle";
  });

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
      if (openTopicKey) {
        setOpenTopicKey(null)
        return
      }
      setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, openTopicKey])

  return (
    <>
      {trigger === "header" ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <ShieldCheck className="h-5 w-5" />
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
                    <span className="text-emerald-700">{summary.coinciden} coinciden</span>
                    {" · "}
                    <span className="text-amber-700">
                      {summary.diferencias} diferencia{summary.diferencias === 1 ? "" : "s"}
                    </span>
                    {" · "}
                    {summary.sinVerificar} sin verificar
                    {latest ? ` · última ${formatContrasteConsultedAt(latest.created_at)}` : ""}
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
          onClick={() => setModalOpen(false)}
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
              {summary ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTopicFilter("ok")}
                    aria-pressed={topicFilter === "ok"}
                    className={`rounded-full border px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold transition-shadow ${
                      topicFilter === "ok"
                        ? "border-emerald-400 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400 ring-offset-2"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {summary.coinciden} coincide{summary.coinciden === 1 ? "" : "n"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTopicFilter("missing")}
                    aria-pressed={topicFilter === "missing"}
                    className={`rounded-full border px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold transition-shadow ${
                      topicFilter === "missing"
                        ? "border-red-400 bg-red-100 text-red-800 ring-2 ring-red-400 ring-offset-2"
                        : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {summary.diferencias} diferencia{summary.diferencias === 1 ? "" : "s"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTopicFilter("unverified")}
                    aria-pressed={topicFilter === "unverified"}
                    className={`rounded-full border px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold transition-shadow ${
                      topicFilter === "unverified"
                        ? "border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-400 ring-offset-2"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <HelpCircle className="h-4 w-4" />
                    {summary.sinVerificar} sin verificar
                  </button>
                </div>
              ) : null}

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

              {payload && topicFilter !== "all" ? (
                <p className="text-[11px] text-slate-500">
                  Filtro activo. Vuelve a pulsar el mismo recuento para ver todo.
                </p>
              ) : null}

              {viewMode === "cards" ? (
                <>
                  {showDifferences && differenceRows.length > 0 ? (
                    <section>
                      <h4 className="text-sm font-bold text-slate-900 mb-3">Diferencias encontradas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {differenceRows.map((row) => (
                          <TopicCard key={row.key} row={row} onOpen={() => setOpenTopicKey(row.key)} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {showMatches && matchRows.length > 0 ? (
                    <section>
                      <h4 className="text-sm font-bold text-slate-900 mb-3">Coincidencias</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {matchRows.map((row) => (
                          <TopicCard key={row.key} row={row} onOpen={() => setOpenTopicKey(row.key)} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {showUnverified && unverifiedRows.length > 0 ? (
                    <section>
                      <h4 className="text-sm font-bold text-slate-900 mb-3">Sin verificar</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {unverifiedRows.map((row) => (
                          <TopicCard key={row.key} row={row} onOpen={() => setOpenTopicKey(row.key)} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : payload ? (
                <section>
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Fuentes consultadas</h4>
                  {tableRows.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay filas en este filtro.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2.5">Dato</th>
                            <th className="px-3 py-2.5">Encargado</th>
                            <th className="px-3 py-2.5">SRI</th>
                            <th className="px-3 py-2.5">ANT</th>
                            {showAmt ? <th className="px-3 py-2.5">AMT</th> : null}
                            <th className="px-3 py-2.5">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((row) => (
                            <tr key={row.key} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => setOpenTopicKey(row.key)}
                                  className="font-semibold text-slate-800 hover:text-blue-700 text-left"
                                >
                                  {row.label}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">{row.encargado}</td>
                              <td className={`px-3 py-2.5 ${matrixCellClass(row.sri.kind)}`}>{row.sri.text}</td>
                              <td className={`px-3 py-2.5 ${matrixCellClass(row.ant.kind)}`}>{row.ant.text}</td>
                              {showAmt ? (
                                <td className={`px-3 py-2.5 ${matrixCellClass(row.amt.kind)}`}>{row.amt.text}</td>
                              ) : null}
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold ${resultadoBadgeClass(row.resultado.kind)}`}>
                                  {row.resultado.text}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ) : null}

              {payload && topicFilter === "missing" && differenceRows.length === 0 ? (
                <p className="text-sm text-emerald-700 font-medium">No hay diferencias en esta consulta.</p>
              ) : null}
              {payload && topicFilter === "ok" && matchRows.length === 0 ? (
                <p className="text-sm text-slate-500">No hay coincidencias en esta consulta.</p>
              ) : null}
              {payload && topicFilter === "unverified" && unverifiedRows.length === 0 ? (
                <p className="text-sm text-slate-500">No hay rubros sin verificar en esta consulta.</p>
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
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
