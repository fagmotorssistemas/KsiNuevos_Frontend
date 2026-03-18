"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import type { LegalCaseRow } from "@/types/legal.types";

export function ChangeStatusForm({
  caseData,
  onCancel,
  onSuccess,
}: {
  caseData: LegalCaseRow;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [estadoNuevo, setEstadoNuevo] = useState(caseData.estado || "gestionando");
  const [descripcion, setDescripcion] = useState("");
  const [proximaAccion, setProximaAccion] = useState(caseData.proxima_accion || "");
  const [fechaProxima, setFechaProxima] = useState(() => {
    if (caseData.fecha_proxima_accion) {
      // Intentar formatear la fecha existente para el input datetime-local
      try {
        return new Date(caseData.fecha_proxima_accion).toISOString().slice(0, 16);
      } catch (e) {
        // Ignorar error
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });

  const onSubmit = async () => {
    if (!descripcion.trim()) {
      alert("Debes justificar por qué cambias el estado (Descripción del evento)");
      return;
    }
    if (!proximaAccion.trim()) {
      alert("Debes definir una próxima acción.");
      return;
    }
    
    setSaving(true);
    try {
      await legalCasesService.changeStatus({
        case_id: caseData.id,
        estado_nuevo: estadoNuevo as any,
        event_tipo: "sistema",
        event_descripcion: `Cambio de estado a: ${estadoNuevo}. ${descripcion}`,
        proxima_accion: proximaAccion,
        fecha_proxima_accion: new Date(fechaProxima).toISOString(),
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Cambiar Estado del Expediente
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Estado actual: <span className="font-bold text-slate-700 uppercase">{caseData.estado?.replace('_', ' ')}</span>
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <RefreshCw className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Nuevo Estado
          </label>
          <select
            value={estadoNuevo}
            onChange={(e) => setEstadoNuevo(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="nuevo">Nuevo</option>
            <option value="gestionando">Gestionando</option>
            <option value="pre_judicial">Pre-Judicial</option>
            <option value="judicial">Judicial</option>
            <option value="cerrado">Cerrado / Resuelto</option>
            <option value="castigado">Castigado / Incobrable</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Justificación / Detalles del Cambio
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="¿Por qué se cambia el estado del caso?"
            rows={3}
            className="mt-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all resize-none"
          />
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="text-sm font-bold text-slate-800">
            Obligatorio: Actualizar Próxima Acción
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Siguiente Paso
              </label>
              <input
                value={proximaAccion}
                onChange={(e) => setProximaAccion(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Fecha Límite
              </label>
              <input
                type="datetime-local"
                value={fechaProxima}
                onChange={(e) => setFechaProxima(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={saving}
          className="h-11 px-6 rounded-full text-slate-600 hover:bg-slate-100 transition text-sm font-bold disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="h-11 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition shadow-lg shadow-slate-200 text-sm font-bold disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Cambiar Estado
        </button>
      </div>
    </div>
  );
}