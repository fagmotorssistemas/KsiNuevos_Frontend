"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClienteDeudaSummary } from "@/types/wallet.types";
import { Loader2, MoreVertical } from "lucide-react";

type MoraBucket = "temprana" | "media" | "alta";
type Semaforo = "verde" | "amarillo" | "rojo";

type CaseLite = {
  id: string;
  id_sistema: number;
  fecha_ultima_gestion: string | null;
};

/** clienteId → tipo de última acción legal (solo informativo en la tarjeta). */
type LastActionByClient = Record<number, { tipo: string | null }>;

/** Temprana ≤30d (1 mes) · Media 31–89d (~2 meses) · Alta ≥90d (3+ meses). */
function getMoraBucket(diasMora: number): MoraBucket | null {
  if (diasMora <= 0) return null;
  if (diasMora <= 30) return "temprana";
  if (diasMora < 90) return "media";
  return "alta";
}

/** Semáforo = misma regla que las columnas: solo por días de mora. */
function getSemaforo(diasMora: number): Semaforo {
  const bucket = getMoraBucket(diasMora);
  if (bucket === "temprana") return "verde";
  if (bucket === "media") return "amarillo";
  return "rojo";
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTipoAccion(tipo: string | null | undefined): string {
  if (!tipo) return "Sin gestión";
  const t = tipo.toLowerCase().trim();
  const map: Record<string, string> = {
    llamada: "Llamada",
    mensaje: "Mensaje",
    notificacion: "Notificación",
    nota: "Observación",
    tarea: "Tarea",
    sistema: "Sistema",
    creacion: "Apertura",
    whatsapp: "WhatsApp",
    email: "Email",
    presencial: "Presencial",
  };
  return map[t] || tipo.replace(/_/g, " ");
}

const COLUMN_META: Record<
  MoraBucket,
  { title: string; subtitle: string; accent: string; bar: string; dot: string }
> = {
  temprana: {
    title: "Temprana",
    subtitle: "Hasta 1 mes de mora",
    accent: "border-t-emerald-400",
    bar: "bg-emerald-400",
    dot: "bg-emerald-500",
  },
  media: {
    title: "Media",
    subtitle: "Hasta ~2 meses de mora",
    accent: "border-t-sky-400",
    bar: "bg-sky-400",
    dot: "bg-sky-500",
  },
  alta: {
    title: "Alta",
    subtitle: "3 meses de mora en adelante",
    accent: "border-t-rose-400",
    bar: "bg-rose-400",
    dot: "bg-rose-500",
  },
};

const SEMAFORO_META: Record<
  Semaforo,
  { label: string; className: string }
> = {
  verde: {
    label: "1 mes",
    className: "bg-emerald-500 text-white",
  },
  amarillo: {
    label: "2 meses",
    className: "bg-amber-400 text-amber-950",
  },
  rojo: {
    label: "3+ meses",
    className: "bg-rose-500 text-white",
  },
};

interface DebtorsKanbanBoardProps {
  debtors: ClienteDeudaSummary[];
  loading?: boolean;
  onViewDetail: (clienteId: number) => void;
}

export function DebtorsKanbanBoard({
  debtors,
  loading,
  onViewDetail,
}: DebtorsKanbanBoardProps) {
  const [actionsByClient, setActionsByClient] = useState<LastActionByClient>(
    {},
  );
  const [loadingActions, setLoadingActions] = useState(false);

  const withMora = useMemo(
    () => debtors.filter((d) => d.diasMoraMaximo > 0),
    [debtors],
  );

  const columns = useMemo(() => {
    const buckets: Record<MoraBucket, ClienteDeudaSummary[]> = {
      temprana: [],
      media: [],
      alta: [],
    };
    for (const d of withMora) {
      const b = getMoraBucket(d.diasMoraMaximo);
      if (b) buckets[b].push(d);
    }
    for (const key of Object.keys(buckets) as MoraBucket[]) {
      buckets[key].sort((a, b) => b.diasMoraMaximo - a.diasMoraMaximo);
    }
    return buckets;
  }, [withMora]);

  useEffect(() => {
    const ids = withMora.map((d) => d.clienteId);
    if (ids.length === 0) {
      setActionsByClient({});
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingActions(true);
      try {
        const supabase = createClient();
        const { data: cases, error } = await supabase
          .from("cases")
          .select("id, id_sistema, fecha_ultima_gestion")
          .in("id_sistema", ids)
          .not("id_sistema", "is", null);

        if (error) throw error;
        if (cancelled) return;

        const caseList = (cases || []) as CaseLite[];
        // Un caso por cliente: el más reciente por fecha_ultima_gestion
        const caseByClient = new Map<number, CaseLite>();
        for (const c of caseList) {
          if (c.id_sistema == null) continue;
          const prev = caseByClient.get(c.id_sistema);
          if (!prev) {
            caseByClient.set(c.id_sistema, c);
            continue;
          }
          const prevT = prev.fecha_ultima_gestion
            ? new Date(prev.fecha_ultima_gestion).getTime()
            : 0;
          const nextT = c.fecha_ultima_gestion
            ? new Date(c.fecha_ultima_gestion).getTime()
            : 0;
          if (nextT >= prevT) caseByClient.set(c.id_sistema, c);
        }

        const caseIds = [...caseByClient.values()].map((c) => c.id);
        const tipoByCase = new Map<string, string>();

        if (caseIds.length > 0) {
          const { data: events, error: evErr } = await supabase
            .from("case_events")
            .select("case_id, tipo, fecha")
            .in("case_id", caseIds)
            .order("fecha", { ascending: false });

          if (evErr) throw evErr;
          for (const e of events || []) {
            if (!tipoByCase.has(e.case_id)) {
              tipoByCase.set(e.case_id, e.tipo);
            }
          }
        }

        const map: LastActionByClient = {};
        for (const [clientId, c] of caseByClient) {
          map[clientId] = { tipo: tipoByCase.get(c.id) ?? null };
        }
        if (!cancelled) setActionsByClient(map);
      } catch (e) {
        console.error("[DebtorsKanbanBoard] acciones legales:", e);
        if (!cancelled) setActionsByClient({});
      } finally {
        if (!cancelled) setLoadingActions(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [withMora]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p className="text-sm">Cargando tablero…</p>
      </div>
    );
  }

  if (withMora.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <p className="text-slate-500 font-medium text-sm">
          No hay clientes con mora para el tablero.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="px-1">
        <p className="text-xs text-slate-500">
          Solo visualización · columnas por días de mora
          {loadingActions ? " · sincronizando gestiones…" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {(Object.keys(COLUMN_META) as MoraBucket[]).map((bucket) => {
          const meta = COLUMN_META[bucket];
          const cards = columns[bucket];
          return (
            <div
              key={bucket}
              className={`rounded-2xl bg-slate-50/80 border border-slate-200/80 overflow-hidden border-t-4 ${meta.accent}`}
            >
              <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {meta.title}{" "}
                    <span className="font-semibold text-slate-500">
                      ({cards.length}{" "}
                      {cards.length === 1 ? "cliente" : "clientes"})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {meta.subtitle}
                  </p>
                </div>
              </div>
              <div className={`h-0.5 mx-4 mb-3 rounded-full ${meta.bar}`} />

              <div className="px-3 pb-3 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {cards.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Sin clientes en esta columna
                  </div>
                ) : (
                  cards.map((d) => {
                    const action = actionsByClient[d.clienteId];
                    const semaforo = getSemaforo(d.diasMoraMaximo);
                    const sem = SEMAFORO_META[semaforo];
                    return (
                      <button
                        key={d.clienteId}
                        type="button"
                        onClick={() => onViewDetail(d.clienteId)}
                        className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 hover:border-slate-300 hover:shadow-md transition-all group relative"
                      >
                        <div className="absolute top-3 right-3 opacity-40 group-hover:opacity-70">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </div>

                        <div className="pr-6">
                          <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {d.nombre || `Cliente #${d.clienteId}`}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dot}`}
                            />
                            <span className="font-medium capitalize truncate">
                              {d.categoria || "Sin categoría"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1 text-[12px] text-slate-600">
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-400">Monto</span>
                            <span className="font-semibold text-slate-900 tabular-nums">
                              {formatMoney(d.totalDeuda)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-400">Días mora</span>
                            <span className="font-semibold text-slate-900 tabular-nums">
                              {d.diasMoraMaximo} días
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-400">Última acción</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[55%] text-right">
                              {formatTipoAccion(action?.tipo)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${sem.className}`}
                          >
                            {sem.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{d.clienteId}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
