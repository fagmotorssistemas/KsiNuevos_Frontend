"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";

export function AddEventForm({
  caseId,
  onCancel,
  onSuccess,
}: {
  caseId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("llamada");
  const [canal, setCanal] = useState("telefono");
  const [descripcion, setDescripcion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [resultado, setResultado] = useState("");

  const [updateAction, setUpdateAction] = useState(false);
  const [proximaAccion, setProximaAccion] = useState("");
  const [fechaProxima, setFechaProxima] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });

  const onSubmit = async () => {
    if (!descripcion.trim()) {
      alert("La descripción es obligatoria");
      return;
    }
    setSaving(true);
    try {
      await legalCasesService.registerEvent({
        case_id: caseId,
        tipo,
        canal,
        descripcion,
        detalle: detalle.trim() ? detalle : null,
        resultado: resultado.trim() ? resultado : null,
        proxima_accion: updateAction ? proximaAccion : null,
        fecha_proxima_accion: updateAction
          ? new Date(fechaProxima).toISOString()
          : null,
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error registrando gestión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Registrar nueva gestión
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Se agregará al historial del caso
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <Plus className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tipo de gestión
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="llamada">Llamada</option>
            <option value="mensaje">Mensaje</option>
            <option value="nota">Nota interna</option>
            <option value="notificacion">Notificación</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Canal
          </label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="telefono">Teléfono</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="presencial">Presencial</option>
            <option value="sistema">Sistema</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Descripción (¿Qué se hizo?)
          </label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Llamada de cobro para cuota vencida"
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Detalle (¿Qué se conversó/dijo?)
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej: El cliente indica que pagará el próximo viernes a primera hora..."
            rows={3}
            className="mt-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all resize-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Resultado (opcional)
          </label>
          <input
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            placeholder="Ej: Promesa de pago"
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>

        {/* PROXIMA ACCION Opcional */}
        <div className="md:col-span-2 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={updateAction}
              onChange={(e) => setUpdateAction(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span className="text-sm font-bold text-slate-800">
              Actualizar próxima acción en agenda
            </span>
          </label>

          {updateAction && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Acción
                </label>
                <input
                  value={proximaAccion}
                  onChange={(e) => setProximaAccion(e.target.value)}
                  className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Fecha
                </label>
                <input
                  type="datetime-local"
                  value={fechaProxima}
                  onChange={(e) => setFechaProxima(e.target.value)}
                  className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
                />
              </div>
            </div>
          )}
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
            <Plus className="h-4 w-4" />
          )}
          Registrar
        </button>
      </div>
    </div>
  );
}
