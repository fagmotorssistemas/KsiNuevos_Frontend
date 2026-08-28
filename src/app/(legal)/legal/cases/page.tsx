"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, RefreshCw, ChevronRight, Scale, CalendarClock } from "lucide-react";
import { walletService } from "@/services/wallet.service";
import {
  ecuadorYmd,
  formatEcuadorDate,
  formatEcuadorTime,
  todayEcuadorDate,
} from "@/lib/ecuador-datetime";

type CaseListRow = {
  id: string;
  id_sistema: number | null;
  cartera_manual_id: string | null;
  estado: string | null;
  prioridad: string | null;
  riesgo: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  fecha_ultima_gestion: string | null;
  monto_referencia: number | null;
};

type AgendaFocus = "todos" | "abiertos" | "vencidos" | "hoy";

const CLOSED = new Set(["cerrado", "castigado"]);

const ESTADO_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  gestionando: "Gestionando",
  pre_judicial: "Prejudicial",
  judicial: "Judicial",
  cerrado: "Cerrado",
  castigado: "Castigado",
};

function toYmd(iso: string | null | undefined): string {
  return iso ? ecuadorYmd(iso) : "";
}

function daysBetween(fromYmd: string, toYmdValue: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmdValue.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

function isOpenEstado(estado: string | null): boolean {
  return !CLOSED.has((estado || "").toLowerCase());
}

function dueKind(fecha: string | null): "none" | "overdue" | "today" | "later" {
  const day = toYmd(fecha);
  if (!day) return "none";
  const today = todayEcuadorDate();
  if (day < today) return "overdue";
  if (day === today) return "today";
  return "later";
}

function estadoStyle(estado: string | null): { badge: string; avatar: string } {
  switch (estado) {
    case "nuevo":
      return { badge: "bg-sky-50 text-sky-800", avatar: "bg-sky-100 text-sky-800" };
    case "gestionando":
      return { badge: "bg-amber-50 text-amber-900", avatar: "bg-amber-100 text-amber-900" };
    case "pre_judicial":
      return { badge: "bg-orange-50 text-orange-900", avatar: "bg-orange-100 text-orange-900" };
    case "judicial":
      return { badge: "bg-rose-50 text-rose-800", avatar: "bg-rose-100 text-rose-800" };
    case "cerrado":
      return { badge: "bg-emerald-50 text-emerald-800", avatar: "bg-emerald-100 text-emerald-800" };
    case "castigado":
      return { badge: "bg-slate-100 text-slate-600", avatar: "bg-slate-200 text-slate-700" };
    default:
      return { badge: "bg-slate-100 text-slate-700", avatar: "bg-slate-200 text-slate-700" };
  }
}

function initialsFrom(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1 && !/^(de|del|la|las|los|y)$/i.test(p));
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "CL";
}

function formatDue(fecha: string | null): { label: string; tone: string } {
  const kind = dueKind(fecha);
  if (kind === "none") return { label: "Sin fecha", tone: "text-slate-400" };
  const time = formatEcuadorTime(fecha);
  if (kind === "overdue") {
    const n = daysBetween(toYmd(fecha), todayEcuadorDate());
    return {
      label: n <= 1 ? `Venció ayer · ${time}` : `Vencida hace ${n} días · ${time}`,
      tone: "text-rose-700",
    };
  }
  if (kind === "today") return { label: `Hoy · ${time}`, tone: "text-amber-800" };
  return { label: `${formatEcuadorDate(fecha)} · ${time}`, tone: "text-slate-500" };
}

function formatLastGestion(fecha: string | null): string {
  const day = toYmd(fecha);
  if (!day) return "Sin gestión";
  const n = daysBetween(day, todayEcuadorDate());
  if (n === 0) return `Hoy ${formatEcuadorTime(fecha)}`;
  if (n === 1) return "Ayer";
  if (n < 7) return `Hace ${n} días`;
  return formatEcuadorDate(fecha);
}

function CaseRow({
  row,
  displayName,
}: {
  row: CaseListRow;
  displayName: string;
}) {
  const isManual = Boolean(row.cartera_manual_id);
  const tone = estadoStyle(row.estado);
  const due = formatDue(row.fecha_proxima_accion);
  const overdue = dueKind(row.fecha_proxima_accion) === "overdue" && isOpenEstado(row.estado);

  return (
    <Link
      href={`/legal/cases/${row.id}`}
      className="group flex items-start gap-5 px-6 py-5 sm:px-8 sm:py-6 hover:bg-slate-50/80 transition-colors"
    >
      <div
        className={`mt-0.5 h-11 w-11 rounded-2xl flex items-center justify-center text-[12px] font-semibold shrink-0 ${tone.avatar}`}
      >
        {initialsFrom(displayName)}
      </div>

      <div className="min-w-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3 lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-slate-900 tracking-tight truncate">
              {displayName}
            </p>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone.badge}`}
            >
              {ESTADO_LABEL[row.estado || ""] || row.estado || "Sin estado"}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-400">
            {isManual ? "Cartera manual" : `Oracle · #${row.id_sistema ?? "—"}`}
            <span className="text-slate-300"> · </span>
            {formatLastGestion(row.fecha_ultima_gestion)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Próxima acción
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-2 leading-relaxed">
            {row.proxima_accion || "Sin acción programada"}
          </p>
          <p className={`mt-1.5 text-sm ${due.tone}`}>{due.label}</p>
        </div>
      </div>

      {overdue && (
        <span className="hidden sm:inline-flex mt-1 h-2 w-2 rounded-full bg-rose-500 shrink-0" />
      )}
      <ChevronRight className="hidden sm:block mt-2 h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
    </Link>
  );
}

function LegalCasesPageContent() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CaseListRow[]>([]);
  const [clientNamesById, setClientNamesById] = useState<Record<number, string>>({});
  const [manualNamesById, setManualNamesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState<AgendaFocus>("todos");
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || searchParams.get("id_sistema") || "");

  const clientName = (c: CaseListRow) => {
    const isManual = Boolean(c.cartera_manual_id);
    return (
      (c.id_sistema != null && clientNamesById[c.id_sistema]) ||
      (c.cartera_manual_id && manualNamesById[c.cartera_manual_id]) ||
      (isManual ? "Cartera manual" : `Cliente #${c.id_sistema ?? "—"}`)
    );
  };

  const fetchCases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select(
        "id,id_sistema,cartera_manual_id,estado,prioridad,riesgo,proxima_accion,fecha_proxima_accion,fecha_ultima_gestion,monto_referencia",
      )
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      setRows([]);
      setClientNamesById({});
      setManualNamesById({});
    } else {
      const nextRows = (data ?? []) as CaseListRow[];
      setRows(nextRows);

      try {
        const ids = Array.from(
          new Set(
            nextRows
              .map((r) => r.id_sistema)
              .filter((x): x is number => x != null && typeof x === "number"),
          ),
        );
        if (ids.length) {
          const debtors = await walletService.getAllDebtors(5000);
          const map: Record<number, string> = {};
          for (const d of debtors) {
            if (typeof d.clienteId === "number" && d.nombre) map[d.clienteId] = d.nombre;
          }
          const filtered: Record<number, string> = {};
          for (const id of ids) {
            if (map[id]) filtered[id] = map[id];
          }
          setClientNamesById(filtered);
        } else {
          setClientNamesById({});
        }

        const manualIds = Array.from(
          new Set(
            nextRows
              .map((r) => r.cartera_manual_id)
              .filter((x): x is string => Boolean(x)),
          ),
        );
        if (manualIds.length) {
          const { data: manRows } = await supabase
            .from("cartera_manual")
            .select("id,nombre_completo")
            .in("id", manualIds);
          const mm: Record<string, string> = {};
          for (const row of (manRows as { id: string; nombre_completo: string }[]) ?? []) {
            mm[row.id] = row.nombre_completo;
          }
          setManualNamesById(mm);
        } else {
          setManualNamesById({});
        }
      } catch (e) {
        console.error("Error cargando nombres de clientes:", e);
        setClientNamesById({});
        setManualNamesById({});
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    let abiertos = 0;
    let vencidos = 0;
    let hoy = 0;
    for (const c of rows) {
      if (!isOpenEstado(c.estado)) continue;
      abiertos += 1;
      const kind = dueKind(c.fecha_proxima_accion);
      if (kind === "overdue") vencidos += 1;
      if (kind === "today") hoy += 1;
    }
    return { total: rows.length, abiertos, vencidos, hoy };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const name = clientName(r);
      if (query) {
        const idSistema = String(r.id_sistema ?? "");
        const refManual = (r.cartera_manual_id || "").toLowerCase();
        const matches =
          idSistema.includes(query) ||
          refManual.includes(query) ||
          (r.estado || "").toLowerCase().includes(query) ||
          (ESTADO_LABEL[r.estado || ""] || "").toLowerCase().includes(query) ||
          (r.proxima_accion || "").toLowerCase().includes(query) ||
          name.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (focus === "abiertos") return isOpenEstado(r.estado);
      if (focus === "vencidos") {
        return isOpenEstado(r.estado) && dueKind(r.fecha_proxima_accion) === "overdue";
      }
      if (focus === "hoy") {
        return isOpenEstado(r.estado) && dueKind(r.fecha_proxima_accion) === "today";
      }
      return true;
    });
  }, [rows, q, focus, clientNamesById, manualNamesById]);

  const toggleFocus = (next: AgendaFocus) => {
    setFocus((current) => (current === next ? "todos" : next));
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Legal
          </p>
          <h1 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-900">
            Casos legales
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
            Expedientes abiertos, la próxima acción y si ya se venció.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchCases()}
            className="h-11 w-11 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center"
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/legal/cases/new"
            className="h-11 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nuevo caso
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(
          [
            {
              id: "abiertos" as const,
              label: "Abiertos",
              value: stats.abiertos,
              hint: "En curso",
            },
            {
              id: "vencidos" as const,
              label: "Vencidos",
              value: stats.vencidos,
              hint: "Ya pasaron la fecha",
            },
            {
              id: "hoy" as const,
              label: "Para hoy",
              value: stats.hoy,
              hint: "Acción de este día",
            },
          ] as const
        ).map((card) => {
          const selected = focus === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggleFocus(card.id)}
              aria-pressed={selected}
              className={`text-left rounded-3xl border px-6 py-5 transition-colors ${
                selected
                  ? "bg-white border-slate-300 shadow-sm ring-1 ring-slate-900/5"
                  : "bg-white/80 border-slate-200/80 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {loading ? "—" : card.value.toLocaleString("es-EC")}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">{card.hint}</p>
            </button>
          );
        })}
      </section>

      <section className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 flex items-center gap-3 h-12 rounded-2xl bg-slate-50 px-4">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, ID o estado"
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <p className="text-sm text-slate-400 tabular-nums sm:pr-1">
            {loading
              ? "Cargando"
              : `${filtered.length.toLocaleString("es-EC")} de ${stats.total.toLocaleString("es-EC")}`}
          </p>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-8 py-6 flex gap-5">
                <div className="h-11 w-11 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-48 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-3 w-72 rounded-full bg-slate-50 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-8 py-20 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
              {focus === "hoy" ? (
                <CalendarClock className="h-5 w-5" />
              ) : (
                <Scale className="h-5 w-5" />
              )}
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              {q.trim()
                ? "Nada coincide con esa búsqueda"
                : focus === "vencidos"
                  ? "No hay acciones vencidas"
                  : focus === "hoy"
                    ? "Nada programado para hoy"
                    : "No hay casos para mostrar"}
            </p>
            <p className="mt-1.5 text-sm text-slate-400">
              {q.trim() || focus !== "todos"
                ? "Prueba otra búsqueda o vuelve a todos los casos."
                : "Crea un expediente para empezar."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <CaseRow key={c.id} row={c} displayName={clientName(c)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function LegalCasesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="h-20 rounded-3xl bg-white border border-slate-100 animate-pulse" />
          <div className="h-80 rounded-[28px] bg-white border border-slate-100 animate-pulse" />
        </div>
      }
    >
      <LegalCasesPageContent />
    </Suspense>
  );
}
