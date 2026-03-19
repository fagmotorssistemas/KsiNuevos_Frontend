"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Car,
  HandCoins,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Phone,
  Scale,
  LayoutList,
  AlertTriangle,
  CalendarClock,
  DollarSign,
  TrendingDown,
  FileWarning,
} from "lucide-react";
import { carteraManualService } from "@/services/carteraManual.service";
import type { CarteraManualEstado, CarteraManualRow } from "@/types/carteraManual.types";
import { LegalCasesTab } from "@/components/features/accounting/wallet/LegalCasesTab";
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth";

type FilterMode = "all" | "vencidos" | "aldia";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

const ESTADOS: { value: CarteraManualEstado; label: string }[] = [
  { value: "vigente", label: "Vigente" },
  { value: "regularizado", label: "Regularizado" },
  { value: "judicial", label: "Judicial" },
  { value: "castigado", label: "Castigado" },
  { value: "cerrado", label: "Cerrado" },
];

function isProxVencido(r: CarteraManualRow): boolean {
  if (!r.proximo_vencimiento) return false;
  const v = new Date(r.proximo_vencimiento + "T12:00:00");
  v.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return v < today && r.saldo_actual > 0;
}

function isMorosoManual(r: CarteraManualRow): boolean {
  return r.dias_mora > 0 || isProxVencido(r);
}

export function CarteraManualModule() {
  const { profile, user } = useAuth();
  const role = (profile?.role || "").toLowerCase().trim();
  const isLegalRole =
    role === "admin" || role === "abogado" || role === "abogada";

  const [rows, setRows] = useState<CarteraManualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [listMode, setListMode] = useState<"risk" | "mora" | "all">("risk");
  const [showForm, setShowForm] = useState(false);

  const handleMoraViewClick = () => {
    setListMode("mora");
    setFilterMode("vencidos");
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await carteraManualService.listActive();
      setRows(data);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar cartera manual. ¿Aplicaste la migración SQL?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const kpis = useMemo(() => {
    const totalSaldo = rows.reduce((acc, r) => acc + r.saldo_actual, 0);
    const conSaldo = rows.filter((r) => r.saldo_actual > 0);
    const morosos = rows.filter(isMorosoManual);
    const saldoMoroso = morosos.reduce((acc, r) => acc + r.saldo_actual, 0);
    const alDia = rows.filter((r) => r.saldo_actual > 0 && !isMorosoManual(r));
    const saldoAlDia = alDia.reduce((acc, r) => acc + r.saldo_actual, 0);
    const pct =
      totalSaldo > 0 ? Math.round((saldoMoroso / totalSaldo) * 100) : 0;
    return {
      totalSaldo,
      countConSaldo: conSaldo.length,
      saldoMoroso,
      countMoroso: morosos.length,
      saldoAlDia,
      countAlDia: alDia.length,
      pctMorosidad: pct,
      totalRegistros: rows.length,
    };
  }, [rows]);

  const filteredBase = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const blob = [
          r.nombre_completo,
          r.identificacion,
          r.telefono_1,
          r.telefono_2,
          r.vehiculo_marca,
          r.vehiculo_modelo,
          r.vehiculo_placa,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (filterMode === "vencidos") {
        if (!isMorosoManual(r)) return false;
      }
      if (filterMode === "aldia") {
        if (isMorosoManual(r)) return false;
      }
      return true;
    });
  }, [rows, search, filterMode]);

  const tableRows = useMemo(() => {
    let list = [...filteredBase];
    if (listMode === "risk") {
      list = list
        .filter((r) => r.saldo_actual > 0)
        .sort((a, b) => b.saldo_actual - a.saldo_actual);
    } else if (listMode === "mora") {
      list = list.sort(
        (a, b) => b.dias_mora - a.dias_mora || b.saldo_actual - a.saldo_actual,
      );
    } else {
      list = list.sort((a, b) =>
        a.nombre_completo.localeCompare(b.nombre_completo, "es"),
      );
    }
    return list;
  }, [filteredBase, listMode]);

  const isAbogadoRole = role === "abogado" || role === "abogada";

  if (selected) {
    return (
      <CarteraManualDetail
        row={selected}
        onBack={() => {
          setSelectedId(null);
          load();
        }}
        isLegalRole={isLegalRole}
      />
    );
  }

  const fmtKpi = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const kpiCards = [
    {
      id: "all" as const,
      label: "Total cartera manual",
      value: fmtKpi(kpis.totalSaldo),
      sub: `${kpis.countConSaldo} con saldo · ${kpis.totalRegistros} registros`,
      icon: DollarSign,
      color: "text-slate-900",
      bg: "bg-white",
      border: "border-slate-200",
      activeClass: "ring-2 ring-slate-400 bg-slate-50",
    },
    {
      id: "vencidos" as const,
      label: "Saldo en mora / vencido",
      value: fmtKpi(kpis.saldoMoroso),
      sub: `${kpis.countMoroso} obligaciones`,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
      activeClass: "ring-2 ring-red-400 bg-red-100",
    },
    {
      id: "aldia" as const,
      label: "Saldo al día",
      value: fmtKpi(kpis.saldoAlDia),
      sub: `${kpis.countAlDia} obligaciones`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      activeClass: "ring-2 ring-emerald-400 bg-emerald-100",
    },
    {
      id: "stats" as const,
      label: "Riesgo (sobre saldo)",
      value: `${kpis.pctMorosidad}%`,
      sub: "Del total en cartera manual",
      icon: TrendingDown,
      color:
        kpis.pctMorosidad > 10 ? "text-red-600" : "text-slate-600",
      bg: "bg-white",
      border:
        kpis.pctMorosidad > 10 ? "border-red-200" : "border-slate-200",
      activeClass: "",
    },
  ];

  const visibleKpiCards = isAbogadoRole
    ? kpiCards.filter((c) => c.id !== "all" && c.id !== "aldia")
    : kpiCards;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HandCoins className="h-7 w-7 text-red-600" />
            Cartera manual
            {loading && (
              <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Centro de comando · obligaciones fuera de Oracle (misma lógica visual
            que Cartera)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:min-w-[320px]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              placeholder="Buscar cliente, doc, teléfono, vehículo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => load()}
              disabled={loading}
              className="h-11 px-4"
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(true)}
              className="h-11 px-4 font-semibold shadow-md whitespace-nowrap"
              type="button"
            >
              <Plus className="h-4 w-4 mr-1.5 shrink-0" />
              Nueva obligación
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in duration-500">
        {/* KPIs estilo cartera */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && rows.length === 0 ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </>
          ) : (
            visibleKpiCards.map((card, idx) => {
              const Icon = card.icon;
              const isActive =
                card.id !== "stats" && filterMode === card.id;
              const clickable = card.id !== "stats";
              const inner = (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`p-2 rounded-lg ${card.bg === "bg-white" ? "bg-slate-50" : "bg-white/70"}`}
                    >
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {card.label}
                  </p>
                  <p className={`text-xl font-black ${card.color}`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 leading-snug">
                    {card.sub}
                  </p>
                </>
              );
              if (!clickable) {
                return (
                  <div
                    key={idx}
                    className={`text-left relative p-5 rounded-xl border w-full ${card.bg} ${card.border}`}
                  >
                    {inner}
                  </div>
                );
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFilterMode(card.id as FilterMode)}
                  className={`
                    text-left relative p-5 rounded-xl border transition-all duration-200 w-full
                    ${isActive ? card.activeClass : `${card.bg} ${card.border} hover:shadow-md`}
                    cursor-pointer hover:-translate-y-0.5
                  `}
                >
                  {inner}
                </button>
              );
            })
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex p-1 bg-slate-100 rounded-lg w-full sm:w-fit overflow-x-auto">
              <button
                type="button"
                onClick={() => setListMode("risk")}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  listMode === "risk"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 ${listMode === "risk" ? "text-red-500" : ""}`}
                />
                Prioridad alta
              </button>
              <button
                type="button"
                onClick={handleMoraViewClick}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  listMode === "mora"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <CalendarClock
                  className={`h-4 w-4 ${listMode === "mora" ? "text-orange-500" : ""}`}
                />
                Mayor mora
              </button>
              <button
                type="button"
                onClick={() => setListMode("all")}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  listMode === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutList
                  className={`h-4 w-4 ${listMode === "all" ? "text-blue-500" : ""}`}
                />
                Directorio A-Z
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium px-2">
                {tableRows.length} regs
              </span>
              {(["all", "vencidos", "aldia"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterMode(m)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterMode === m
                      ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:bg-white/80"
                  }`}
                >
                  {m === "all"
                    ? "Todos"
                    : m === "vencidos"
                      ? "Vencidos"
                      : "Al día"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-4 px-1">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-red-600" />
              {listMode === "risk" && "Top deudores (manual)"}
              {listMode === "mora" && "Mayor mora (manual)"}
              {listMode === "all" && "Directorio completo"}
            </h3>
            <p className="text-xs text-slate-500">
              {listMode === "risk" &&
                "Obligaciones con mayor saldo pendiente. Sin Oracle."}
              {listMode === "mora" &&
                "Orden por días de mora y saldo. Enfocado en cobranza."}
              {listMode === "all" &&
                "Listado alfabético de todas las obligaciones activas."}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    Cliente / ID
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Vehículo
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">Saldo</th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Cuotas
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">Vence</th>
                  <th className="text-center px-4 py-3 font-semibold">Mora</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Cargando…
                        </span>
                      ) : (
                        "Sin registros con estos filtros."
                      )}
                    </td>
                  </tr>
                ) : (
                  tableRows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {r.nombre_completo}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {r.identificacion || "Sin identificación"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {[r.vehiculo_marca, r.vehiculo_modelo]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </div>
                      {r.vehiculo_placa && (
                        <div className="text-xs font-mono text-slate-400">
                          {r.vehiculo_placa}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatMoney(r.saldo_actual)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {r.numero_cuotas_pagadas ?? 0}
                      {r.numero_cuotas_total != null
                        ? ` / ${r.numero_cuotas_total}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(r.proximo_vencimiento)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.dias_mora > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {r.dias_mora} d
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {r.estado_operacion.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="link-gray"
                        size="sm"
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(r.id);
                        }}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {showForm && (
        <CarteraManualCreateModal
          userId={user?.id}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function CarteraManualDetail({
  row,
  onBack,
  isLegalRole,
}: {
  row: CarteraManualRow;
  onBack: () => void;
  isLegalRole: boolean;
}) {
  const vencido = isMorosoManual(row);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex gap-4">
              <Button
                variant="link-gray"
                size="sm"
                onClick={onBack}
                className="h-10 w-10 p-0 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                  {row.nombre_completo}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                    ID registro: {row.id.slice(0, 8)}…
                  </span>
                  {row.identificacion && (
                    <span>ID: {row.identificacion}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                  {row.telefono_1 && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {row.telefono_1}
                    </span>
                  )}
                  {row.telefono_2 && <span>{row.telefono_2}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Saldo
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatMoney(row.saldo_actual)}
                </p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Situación
                </p>
                <div
                  className={`flex items-center gap-2 font-bold ${vencido ? "text-red-600" : "text-emerald-600"}`}
                >
                  {vencido ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  {vencido ? "VENCIDO / MORA" : "AL DÍA"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Vehículo
            </h3>
            <p className="text-slate-800">
              {[row.vehiculo_marca, row.vehiculo_modelo, row.vehiculo_anio]
                .filter(Boolean)
                .join(" ") || "—"}
            </p>
            {row.vehiculo_placa && (
              <p className="font-mono text-slate-600">Placa {row.vehiculo_placa}</p>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Crédito
            </h3>
            <ul className="space-y-1 text-slate-700">
              <li>
                Inicio / venta: <strong>{formatDate(row.fecha_venta)}</strong>
              </li>
              <li>
                Cuotas:{" "}
                <strong>
                  {row.numero_cuotas_pagadas ?? 0}
                  {row.numero_cuotas_total != null
                    ? ` / ${row.numero_cuotas_total}`
                    : ""}
                </strong>
              </li>
              {row.valor_cuota != null && (
                <li>
                  Valor cuota: <strong>{formatMoney(row.valor_cuota)}</strong>
                </li>
              )}
              {row.frecuencia_pago && (
                <li>
                  Frecuencia: <strong>{row.frecuencia_pago}</strong>
                </li>
              )}
              {row.monto_original != null && (
                <li>
                  Monto original: <strong>{formatMoney(row.monto_original)}</strong>
                </li>
              )}
            </ul>
          </div>
          {row.notas_internas && (
            <div className="md:col-span-2 p-4 bg-amber-50/50 border border-amber-100 rounded-lg text-slate-700">
              <span className="text-xs font-bold text-amber-800 uppercase">
                Notas internas
              </span>
              <p className="mt-1 whitespace-pre-wrap">{row.notas_internas}</p>
            </div>
          )}
        </div>
      </div>

      {isLegalRole && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Gestión legal de cartera
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Mismo flujo que Oracle, vinculado a esta obligación manual.
              </p>
            </div>
          </div>
          <LegalCasesTab
            legalContext={{ type: "manual", carteraManualId: row.id }}
            defaultMontoReferenciaForNewCase={row.saldo_actual}
          />
        </div>
      )}
    </div>
  );
}

function CarteraManualCreateModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);
  const [nombre_completo, setNombreCompleto] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [telefono_1, setTelefono1] = useState("");
  const [telefono_2, setTelefono2] = useState("");
  const [vehiculo_marca, setVehiculoMarca] = useState("");
  const [vehiculo_modelo, setVehiculoModelo] = useState("");
  const [vehiculo_anio, setVehiculoAnio] = useState("");
  const [vehiculo_placa, setVehiculoPlaca] = useState("");
  const [fecha_venta, setFechaVenta] = useState("");
  const [monto_original, setMontoOriginal] = useState("");
  const [saldo_actual, setSaldoActual] = useState("");
  const [valor_cuota, setValorCuota] = useState("");
  const [numero_cuotas_total, setNumeroCuotasTotal] = useState("");
  const [numero_cuotas_pagadas, setNumeroCuotasPagadas] = useState("0");
  const [frecuencia_pago, setFrecuenciaPago] = useState("mensual");
  const [proximo_vencimiento, setProximoVencimiento] = useState("");
  const [estado_operacion, setEstadoOperacion] =
    useState<CarteraManualEstado>("vigente");
  const [notas_internas, setNotasInternas] = useState("");

  const submit = async () => {
    if (!nombre_completo.trim()) {
      alert("Nombre del cliente es obligatorio.");
      return;
    }
    const saldo = Number(saldo_actual);
    if (!Number.isFinite(saldo) || saldo < 0) {
      alert("Saldo actual debe ser un número válido.");
      return;
    }
    setSaving(true);
    try {
      await carteraManualService.create(
        {
          nombre_completo: nombre_completo.trim(),
          identificacion: identificacion.trim() || null,
          telefono_1: telefono_1.trim() || null,
          telefono_2: telefono_2.trim() || null,
          email: null,
          direccion: null,
          vehiculo_marca: vehiculo_marca.trim() || null,
          vehiculo_modelo: vehiculo_modelo.trim() || null,
          vehiculo_anio: vehiculo_anio.trim() || null,
          vehiculo_placa: vehiculo_placa.trim() || null,
          fecha_venta: fecha_venta || null,
          monto_original: monto_original.trim()
            ? Number(monto_original)
            : null,
          saldo_actual: saldo,
          valor_cuota: valor_cuota.trim() ? Number(valor_cuota) : null,
          numero_cuotas_total: numero_cuotas_total.trim()
            ? parseInt(numero_cuotas_total, 10)
            : null,
          numero_cuotas_pagadas: numero_cuotas_pagadas.trim()
            ? parseInt(numero_cuotas_pagadas, 10)
            : 0,
          frecuencia_pago: frecuencia_pago.trim() || null,
          proximo_vencimiento: proximo_vencimiento || null,
          estado_operacion,
          notas_internas: notas_internas.trim() || null,
          activo: true,
          dias_mora: 0,
        },
        userId,
      );
      await onSaved();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === "undefined" || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cartera-manual-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[min(92vh,900px)] overflow-y-auto p-6 space-y-4 border border-slate-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 sticky top-0 bg-white z-10 -mx-6 px-6 pt-0">
          <h2
            id="cartera-manual-modal-title"
            className="text-lg font-bold text-slate-900"
          >
            Nueva obligación
          </h2>
          <button
            type="button"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition shrink-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <span className="text-xl leading-none font-light">×</span>
          </button>
        </div>
        <label className="block text-xs font-bold text-slate-500 uppercase">
          Nombre completo *
        </label>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={nombre_completo}
          onChange={(e) => setNombreCompleto(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Identificación
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Saldo actual *
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={saldo_actual}
              onChange={(e) => setSaldoActual(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Teléfono 1
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={telefono_1}
              onChange={(e) => setTelefono1(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Teléfono 2
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={telefono_2}
              onChange={(e) => setTelefono2(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Marca
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={vehiculo_marca}
              onChange={(e) => setVehiculoMarca(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Modelo
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={vehiculo_modelo}
              onChange={(e) => setVehiculoModelo(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Año / Placa
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              placeholder="Año"
              value={vehiculo_anio}
              onChange={(e) => setVehiculoAnio(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              &nbsp;
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              placeholder="Placa"
              value={vehiculo_placa}
              onChange={(e) => setVehiculoPlaca(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Fecha venta / inicio
            </label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={fecha_venta}
              onChange={(e) => setFechaVenta(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Próx. vencimiento
            </label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={proximo_vencimiento}
              onChange={(e) => setProximoVencimiento(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Monto original
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={monto_original}
              onChange={(e) => setMontoOriginal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Valor cuota
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={valor_cuota}
              onChange={(e) => setValorCuota(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Nº cuotas
            </label>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={numero_cuotas_total}
              onChange={(e) => setNumeroCuotasTotal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Pagadas
            </label>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={numero_cuotas_pagadas}
              onChange={(e) => setNumeroCuotasPagadas(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Frecuencia
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
              value={frecuencia_pago}
              onChange={(e) => setFrecuenciaPago(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">
            Estado
          </label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
            value={estado_operacion}
            onChange={(e) =>
              setEstadoOperacion(e.target.value as CarteraManualEstado)
            }
          >
            {ESTADOS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">
            Notas
          </label>
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 min-h-[80px]"
            value={notas_internas}
            onChange={(e) => setNotasInternas(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-1">
          <Button variant="secondary" size="sm" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={saving}
            type="button"
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
