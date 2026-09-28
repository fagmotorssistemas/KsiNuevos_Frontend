"use client";

import { useMemo, useState } from "react";
import { Calendar, DollarSign, FileText, ShieldCheck, AlertTriangle, Search } from "lucide-react";
import { formatDinero } from "@/utils/format";
import type { SeguroVehicular } from "@/types/seguros.types";
import type { SeguroEnriquecido } from "@/hooks/useSegurosCartera";

function formatFecha(f: string | null): string {
  if (!f) return "—";
  try {
    return new Date(f).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

interface SegurosCarteraTableProps {
  seguros: SeguroVehicular[];
  enrichedData: Map<string, SeguroEnriquecido>;
  loading: boolean;
  creditos: SeguroVehicular[];
  contados: SeguroVehicular[];
  conAlertaRenovacion: SeguroVehicular[];
  filtroTipo: "TODOS" | "CREDITO" | "CONTADO";
  setFiltroTipo: (t: "TODOS" | "CREDITO" | "CONTADO") => void;
  onGestionar: (item: SeguroVehicular) => void;
  /** Si false (Dashboard), se ocultan Financiamiento seguro, Próx. venc., Días para venc., Alerta. En Cartera de Clientes pasar true. */
  showVencimientoColumns?: boolean;
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function SegurosCarteraTable({
  seguros,
  enrichedData,
  loading,
  creditos,
  contados,
  conAlertaRenovacion,
  filtroTipo,
  setFiltroTipo,
  onGestionar,
  showVencimientoColumns = false,
  showRefresh,
  onRefresh,
  isRefreshing,
}: SegurosCarteraTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSeguros = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const termCompact = term.replace(/[\s-]/g, "");

    return seguros.filter((s) => {
      const enr = enrichedData.get(s.id);
      const esCredito = enr?.esCredito ?? false;
      if (filtroTipo === "CREDITO" && !esCredito) return false;
      if (filtroTipo === "CONTADO" && esCredito) return false;

      if (!term) return true;

      const haystack = [
        s.cliente?.nombre,
        s.cliente?.identificacion,
        s.referencia,
        s.bienAsegurado?.descripcion,
        s.bienAsegurado?.placa,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term) || haystack.replace(/[\s-]/g, "").includes(termCompact);
    });
  }, [seguros, enrichedData, filtroTipo, searchTerm]);

  const totalSeguro = filteredSeguros.reduce((acc, s) => acc + s.valores.total, 0);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <ShieldCheck size={32} className="animate-pulse mx-auto mb-3 opacity-60" />
        <p className="text-sm font-medium">Cargando cartera de seguros...</p>
      </div>
    );
  }

  if (seguros.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-100">
        <ShieldCheck size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No hay seguros registrados aún</p>
        <p className="text-xs text-slate-400 mt-1">Las pólizas emitidas aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, auto o placa..."
          aria-label="Buscar por nombre, auto o placa"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {[
            { id: "TODOS" as const, label: "Todos" },
            { id: "CREDITO" as const, label: "Crédito" },
            { id: "CONTADO" as const, label: "Contado" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFiltroTipo(opt.id)}
              className={[
                "px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full transition-all",
                filtroTipo === opt.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            <Calendar size={11} />
            <strong className="font-black">{creditos.length}</strong> a crédito
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <DollarSign size={11} />
            <strong className="font-black">{contados.length}</strong> al contado
          </span>
          {conAlertaRenovacion.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle size={11} />
              <strong className="font-black">{conAlertaRenovacion.length}</strong> renovar 2º año
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Cliente / Nota
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Vehículo
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">
                  Valor total (1 año)
                </th>
                {showVencimientoColumns && (
                  <>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Financiamiento seguro
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Próx. venc.
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">
                      Días para venc.
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Alerta
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">
                  Gestión
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSeguros.length === 0 && (
                <tr>
                  <td
                    colSpan={showVencimientoColumns ? 9 : 5}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No hay pólizas que coincidan con la búsqueda o el filtro seleccionado.
                  </td>
                </tr>
              )}
              {filteredSeguros.map((row) => {
                const enr = enrichedData.get(row.id);
                const esCredito = enr?.esCredito ?? false;
                const dias = enr?.diasParaVencimientoSeguro;
                const alerta = enr?.alertaRenovacion ?? false;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                          esCredito
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {esCredito ? (
                          <>
                            <Calendar size={12} />
                            Crédito
                          </>
                        ) : (
                          <>
                            <DollarSign size={12} />
                            Contado
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 text-sm truncate max-w-[180px]">
                          {row.cliente.nombre || "—"}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <FileText size={10} />
                          {row.referencia}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className="font-semibold text-slate-800">{row.bienAsegurado.descripcion}</span>
                        <span className="text-xs text-slate-500 font-mono">{row.bienAsegurado.placa}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatDinero(row.valores.total)}
                    </td>
                    {showVencimientoColumns && (
                      <>
                        <td className="px-4 py-3 text-right">
                          {esCredito && enr ? (
                            <span className="font-bold text-slate-900">
                              {formatDinero(enr.cuotaSeguroMensual)}/mes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                              <DollarSign size={11} />
                              PAGO ÚNICO
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {enr?.vencimientoPoliza ? formatFecha(enr.vencimientoPoliza) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {dias != null ? (
                            <span
                              className={`inline-flex font-bold text-sm px-2 py-1 rounded-lg ${
                                dias < 0
                                  ? "bg-rose-100 text-rose-800"
                                  : dias <= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {dias < 0
                                ? `Venció hace ${Math.abs(dias)} días`
                                : dias === 0
                                ? "Hoy"
                                : `${dias} días`}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {alerta ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                              <AlertTriangle size={11} />
                              Comprar seguro 2º año
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onGestionar(row)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                      >
                        <ShieldCheck size={14} /> Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            <strong className="text-slate-700">{creditos.length}</strong> a crédito
            <span className="mx-2">·</span>
            <strong className="text-slate-700">{contados.length}</strong> al contado
          </span>
          <span>
            Total seguro (1 año):{" "}
            <strong className="text-emerald-600">{formatDinero(totalSeguro)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
