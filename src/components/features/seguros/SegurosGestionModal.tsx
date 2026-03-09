"use client";

import { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  History,
  FileText,
  Loader2,
  Pencil,
  Paperclip,
} from "lucide-react";
import { segurosService } from "@/services/seguros.service";
import type { SeguroVehicular } from "@/types/seguros.types";
import { formatDinero } from "@/utils/format";

function formatFecha(f: string | null | undefined): string {
  if (!f) return "—";
  try {
    return new Date(f).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

interface PolizaRegistrada {
  id: string;
  broker_id?: string | null;
  aseguradora_id?: string | null;
  broker?: { nombre: string } | null;
  aseguradora?: { nombre: string } | null;
  plan_tipo?: string | null;
  costo_compra?: number;
  evidencias?: string[];
  created_at?: string;
  updated_at?: string;
}

interface SegurosGestionModalProps {
  item: SeguroVehicular;
  onClose: () => void;
  onEditar: () => void;
}

export function SegurosGestionModal({
  item,
  onClose,
  onEditar,
}: SegurosGestionModalProps) {
  const [activeTab, setActiveTab] = useState<"historial" | "datos" | "evidencias">("datos");
  const [poliza, setPoliza] = useState<PolizaRegistrada | null>(null);
  const [loadingPoliza, setLoadingPoliza] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingPoliza(true);
    segurosService
      .obtenerPolizaRegistrada(item.referencia)
      .then((data) => {
        if (!cancelled) setPoliza(data as PolizaRegistrada | null);
      })
      .catch(() => {
        if (!cancelled) setPoliza(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPoliza(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.referencia]);

  const tieneRegistro = !!poliza;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-emerald-200 shadow-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {item.cliente?.nombre ?? "Cliente"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-slate-800 text-white text-xs font-mono px-2 py-0.5 rounded">
                  {item.referencia}
                </span>
                <span className="text-slate-500 text-sm border-l border-slate-300 pl-2">
                  {item.bienAsegurado?.descripcion ?? item.bienAsegurado?.placa ?? "—"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("historial")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "historial"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="h-4 w-4" />
            Historial
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("datos")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "datos"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            Datos del seguro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("evidencias")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "evidencias"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Paperclip className="h-4 w-4" />
            Evidencias
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto bg-white flex-1">
          {loadingPoliza ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-emerald-500" />
              <p className="text-sm">Cargando datos de la póliza...</p>
            </div>
          ) : (
            <>
              {activeTab === "historial" && (
                <div className="animate-in slide-in-from-left-4 duration-300">
                  {tieneRegistro ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                      <div className="space-y-6">
                        <div className="relative pl-10">
                          <div className="absolute left-[10px] top-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-200 z-10" />
                          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100">
                                  Póliza registrada
                                </span>
                                <span className="text-xs text-slate-400 font-mono ml-2">
                                  {formatFecha(poliza?.created_at)}
                                </span>
                                <p className="text-sm text-slate-600 mt-1">
                                  {poliza?.aseguradora?.nombre ?? "—"} · {poliza?.broker?.nombre ?? "—"}
                                </p>
                              </div>
                            </div>
                            {poliza?.updated_at && poliza.updated_at !== poliza?.created_at && (
                              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                                Última actualización: {formatFecha(poliza.updated_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <History className="h-8 w-8 mb-2 opacity-50" />
                      <p>No hay registro de póliza para esta nota.</p>
                      <p className="text-xs mt-1">Use &quot;Editar póliza&quot; para registrar los datos.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "datos" && (
                <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                  {tieneRegistro ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Broker
                          </span>
                          <div className="text-sm font-bold text-slate-900 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            {poliza?.broker?.nombre ?? "—"}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Aseguradora
                          </span>
                          <div className="text-sm font-bold text-slate-900 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            {poliza?.aseguradora?.nombre ?? "—"}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Plan
                          </span>
                          <div className="text-sm font-bold text-slate-900 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            {poliza?.plan_tipo ?? "—"}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Costo póliza (neto)
                          </span>
                          <div className="text-sm font-bold text-slate-900 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            {poliza?.costo_compra != null
                              ? formatDinero(poliza.costo_compra)
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <ShieldCheck className="h-10 w-10 mb-3 opacity-50" />
                      <p className="font-medium">Póliza no registrada</p>
                      <p className="text-xs mt-1">Registre broker, aseguradora, plan y evidencias.</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onEditar}
                      className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <Pencil size={14} /> {tieneRegistro ? "Editar póliza" : "Registrar póliza"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "evidencias" && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  {tieneRegistro && poliza?.evidencias && poliza.evidencias.length > 0 ? (
                    <div className="space-y-2">
                      {poliza.evidencias.map((url, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-1.5 bg-white rounded shadow-sm text-slate-400">
                              <FileText size={14} />
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-slate-600 truncate hover:text-emerald-600 hover:underline"
                            >
                              Ver Documento #{idx + 1}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <Paperclip className="h-8 w-8 mb-2 opacity-50" />
                      <p>Sin evidencias adjuntas.</p>
                      <p className="text-xs mt-1">Use &quot;Editar póliza&quot; en Datos del seguro para agregar documentos.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
