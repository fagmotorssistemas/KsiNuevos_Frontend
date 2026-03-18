"use client";

import { useState } from "react";
import { Loader2, Plus, CalendarClock } from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";

export function AddTaskForm({
  caseId,
  onCancel,
  onSuccess,
}: {
  caseId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("tarea");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });

  const onSubmit = async () => {
    if (!descripcion.trim()) {
      alert("La descripción de la tarea es obligatoria");
      return;
    }
    
    setSaving(true);
    try {
      await legalCasesService.createTask({
        case_id: caseId,
        tipo,
        descripcion,
        fecha_limite: new Date(fechaLimite).toISOString(),
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al crear la tarea");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">Nueva Tarea</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-xs font-medium transition-all bg-white"
          >
            <option value="tarea">Tarea general</option>
            <option value="llamada">Llamada pendiente</option>
            <option value="documento">Revisar documento</option>
            <option value="juzgado">Trámite en juzgado</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Descripción
          </label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="¿Qué hay que hacer?"
            className="w-full h-9 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-xs transition-all"
            autoFocus
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> Fecha Límite
          </label>
          <input
            type="datetime-local"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-xs transition-all"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="h-8 px-4 rounded-lg text-slate-500 hover:bg-slate-100 transition text-xs font-semibold"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="h-8 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm text-xs font-semibold flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Guardar
        </button>
      </div>
    </div>
  );
}