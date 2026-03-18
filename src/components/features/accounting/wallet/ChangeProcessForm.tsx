"use client";

import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import type { LegalCaseRow } from "@/types/legal.types";

export function ChangeProcessForm({
  caseData,
  onCancel,
  onSuccess,
}: {
  caseData: LegalCaseRow;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tipoProceso, setTipoProceso] = useState(caseData.tipo_proceso || "extrajudicial");
  const [objetivoCaso, setObjetivoCaso] = useState(caseData.objetivo_caso || "recuperar_cartera");
  const [estadoVehiculo, setEstadoVehiculo] = useState(caseData.estado_vehiculo || "poder_cliente");
  const [intencionPago, setIntencionPago] = useState(caseData.intencion_pago || "");
  const [contactabilidad, setContactabilidad] = useState(caseData.contactabilidad || "");
  const [proximaAccion, setProximaAccion] = useState(caseData.proxima_accion || "");
  const [fechaProxima, setFechaProxima] = useState(() => {
    if (caseData.fecha_proxima_accion) {
      return new Date(caseData.fecha_proxima_accion).toISOString().slice(0, 16);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [justificacion, setJustificacion] = useState("");

  const handleSubmit = async () => {
    if (!tipoProceso) return alert("Tipo de proceso requerido.");
    if (!objetivoCaso) return alert("Objetivo del caso requerido.");
    if (!estadoVehiculo) return alert("Estado del vehículo requerido.");
    if (!proximaAccion.trim()) return alert("Próxima acción requerida.");
    if (!fechaProxima) return alert("Fecha de próxima acción requerida.");
    if (!justificacion.trim()) return alert("Justificación del cambio requerida.");
    if (tipoProceso === caseData.tipo_proceso) {
      return alert("Selecciona un tipo de proceso distinto al actual.");
    }

    setSaving(true);
    try {
      await legalCasesService.changeProcess({
        case_id: caseData.id,
        tipo_proceso: tipoProceso,
        objetivo_caso: objetivoCaso,
        estado_vehiculo: estadoVehiculo,
        intencion_pago: intencionPago || null,
        contactabilidad: contactabilidad || null,
        proxima_accion: proximaAccion,
        fecha_proxima_accion: new Date(fechaProxima).toISOString(),
        event_descripcion: `Cambio de tipo de proceso: ${caseData.tipo_proceso || "sin_proceso"} -> ${tipoProceso}. Justificación: ${justificacion.trim()}`,
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo cambiar el proceso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Cambiar tipo de proceso</h3>
          <p className="text-sm text-slate-500 mt-1">
            Esta transición abre una nueva fase formal del caso.
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
          <ArrowLeftRight className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Proceso</label>
          <select
            value={tipoProceso}
            onChange={(e) => setTipoProceso(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          >
            <option value="extrajudicial">Cobranza Extrajudicial</option>
            <option value="demanda_ejecutiva">Demanda Ejecutiva</option>
            <option value="mediacion">Mediación</option>
            <option value="judicial">Judicial</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Objetivo del Caso</label>
          <select
            value={objetivoCaso}
            onChange={(e) => setObjetivoCaso(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          >
            <option value="recuperar_cartera">Recuperar Cartera</option>
            <option value="retener_vehiculo">Retener Vehículo</option>
            <option value="renegociar">Renegociar Deuda</option>
            <option value="recuperacion">Recuperación</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado del Vehículo</label>
          <select
            value={estadoVehiculo}
            onChange={(e) => setEstadoVehiculo(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          >
            <option value="poder_cliente">En poder del cliente</option>
            <option value="retenido">Retenido</option>
            <option value="abandonado">Abandonado</option>
            <option value="taller">En taller</option>
            <option value="recuperado">Recuperado</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Intención de Pago (opcional)</label>
          <select
            value={intencionPago}
            onChange={(e) => setIntencionPago(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          >
            <option value="">Sin dato</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
            <option value="nula">Nula</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contactabilidad (opcional)</label>
          <select
            value={contactabilidad}
            onChange={(e) => setContactabilidad(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          >
            <option value="">Sin dato</option>
            <option value="contactado">Contactado</option>
            <option value="no_contesta">No contesta</option>
            <option value="ilocalizable">Ilocalizable</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Próxima Acción</label>
          <input
            value={proximaAccion}
            onChange={(e) => setProximaAccion(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Próxima Acción</label>
          <input
            type="datetime-local"
            value={fechaProxima}
            onChange={(e) => setFechaProxima(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transición del proceso (fija)</label>
          <input
            readOnly
            value={`Cambio de tipo de proceso: ${caseData.tipo_proceso || "sin_proceso"} -> ${tipoProceso}`}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-medium cursor-not-allowed"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Justificación del Cambio</label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            rows={3}
            placeholder="Escribe por qué se cambia el proceso..."
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          onClick={onCancel}
          className="h-10 px-5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="h-10 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold transition inline-flex items-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar transición de proceso
        </button>
      </div>
    </div>
  );
}
