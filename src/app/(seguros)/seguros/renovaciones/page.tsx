"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, ShieldCheck, AlertTriangle } from "lucide-react";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { useSegurosCartera } from "@/hooks/useSegurosCartera";
import type { SeguroVehicular } from "@/types/seguros.types";
import { formatDinero } from "@/utils/format";

function formatFecha(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function SegurosRenovacionesPage() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [soloProximosVencer, setSoloProximosVencer] = useState(true);

  const {
    seguros,
    loading,
    enrichedData,
    cargar,
    conAlertaRenovacion,
  } = useSegurosCartera();

  const listaBase = soloProximosVencer ? conAlertaRenovacion : seguros;

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return listaBase;
    const q = busqueda.trim().toLowerCase();
    return listaBase.filter(
      (s) =>
        (s.cliente.nombre && s.cliente.nombre.toLowerCase().includes(q)) ||
        (s.referencia && s.referencia.toLowerCase().includes(q)) ||
        (s.bienAsegurado.placa && s.bienAsegurado.placa.toLowerCase().includes(q)) ||
        (s.bienAsegurado.descripcion && s.bienAsegurado.descripcion.toLowerCase().includes(q))
    );
  }, [listaBase, busqueda]);

  const handleRenovar = (item: SeguroVehicular) => {
    router.push(`/seguros?nota=${encodeURIComponent(item.referencia)}`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SegurosSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <RefreshCw size={26} className="text-emerald-600" />
                  Renovaciones
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Pólizas próximas a vencer (2º año) o busque cualquier contrato para renovar sin esperar.
                </p>
              </div>
              <button
                type="button"
                onClick={cargar}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={soloProximosVencer}
                  onChange={() => setSoloProximosVencer(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Solo próximos a vencer (≤ 60 días)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={!soloProximosVencer}
                  onChange={() => setSoloProximosVencer(false)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Todos los contratos (buscar y renovar cuando quiera)
              </label>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente, nota de venta o placa..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw size={32} className="animate-spin mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-medium">Cargando...</p>
                </div>
              ) : filtrados.length === 0 ? (
                <div className="py-16 text-center bg-slate-50/50">
                  <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">
                    {soloProximosVencer
                      ? "No hay pólizas próximas a vencer en los próximos 60 días"
                      : "No hay resultados"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {soloProximosVencer
                      ? "Cambie a “Todos los contratos” y busque si desea renovar antes."
                      : "Ajuste la búsqueda o actualice los datos."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Cliente / Nota</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Vehículo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Valor (1 año)</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Próx. venc.</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Días</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right w-28">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((row) => {
                        const enr = enrichedData.get(row.id);
                        const dias = enr?.diasParaVencimientoSeguro;
                        const alerta = enr?.alertaRenovacion ?? false;
                        return (
                          <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{row.cliente.nombre || "—"}</div>
                              <div className="text-xs text-slate-500 font-mono">{row.referencia}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-slate-800">{row.bienAsegurado.descripcion}</div>
                              <div className="text-xs text-slate-500 font-mono">{row.bienAsegurado.placa}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatDinero(row.valores.total)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {enr?.vencimientoPoliza ? formatFecha(enr.vencimientoPoliza) : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {dias != null ? (
                                <span
                                  className={`inline-flex font-bold text-sm px-2 py-1 rounded-lg ${
                                    dias <= 0 ? "bg-rose-100 text-rose-800" : dias <= 60 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {dias <= 0 ? `Venció` : `${dias} días`}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRenovar(row)}
                                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                              >
                                <ShieldCheck size={14} /> Renovar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {filtrados.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                  <strong className="text-slate-700">{filtrados.length}</strong> contrato{filtrados.length !== 1 ? "s" : ""}
                  {soloProximosVencer && (
                    <span className="ml-2 text-amber-700">
                      (próximos a vencer en 60 días)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
