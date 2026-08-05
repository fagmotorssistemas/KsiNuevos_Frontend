"use client";

import { useState } from "react";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  CheckSquare,
  Scale,
  FileCheck2,
  Ban,
} from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import type { LegalCaseRow } from "@/types/legal.types";
import { createClient } from "@/lib/supabase/client";

const PRE_JUDICIAL_CHECKLIST = [
  { id: "identificacion", label: "Identificación del deudor verificada" },
  { id: "contrato", label: "Contrato / pagaré en expediente" },
  { id: "estado_cuenta", label: "Estado de cuenta / kardex actualizado" },
  { id: "notificaciones", label: "Notificaciones de cobro previas documentadas" },
  { id: "bien", label: "Documentación del bien (vehículo) revisada" },
] as const;

const VISITA_RESULTADOS = [
  { value: "acuerdo", label: "Acuerdo" },
  { value: "promesa", label: "Promesa" },
  { value: "no_ubicado", label: "No ubicado" },
  { value: "se_niega", label: "Se niega" },
] as const;

const CERRADO_RESULTADOS = [
  { value: "monto_recuperado", label: "Monto recuperado" },
  { value: "vehiculo_recuperado", label: "Vehículo recuperado" },
  { value: "acuerdo_firmado", label: "Acuerdo firmado" },
] as const;

type FormalEstado = "pre_judicial" | "judicial" | "cerrado" | "castigado";

function isFormalEstado(estado: string): estado is FormalEstado {
  return (
    estado === "pre_judicial" ||
    estado === "judicial" ||
    estado === "cerrado" ||
    estado === "castigado"
  );
}

export function ChangeStatusForm({
  caseData,
  onCancel,
  onSuccess,
  /** Pestaña formal (3+ meses): exige evidencias al avanzar de fase. */
  requireFormalGates = false,
  /** Pestaña operativa: solo Nuevo / Gestionando. */
  operativeOnly = false,
}: {
  caseData: LegalCaseRow;
  onCancel: () => void;
  onSuccess: () => void;
  requireFormalGates?: boolean;
  operativeOnly?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [estadoNuevo, setEstadoNuevo] = useState(
    operativeOnly
      ? caseData.estado === "gestionando"
        ? "gestionando"
        : "nuevo"
      : caseData.estado || "gestionando",
  );
  const [descripcion, setDescripcion] = useState("");
  const [proximaAccion, setProximaAccion] = useState(
    caseData.proxima_accion || "",
  );
  const [fechaProxima, setFechaProxima] = useState(() => {
    if (caseData.fecha_proxima_accion) {
      try {
        return new Date(caseData.fecha_proxima_accion)
          .toISOString()
          .slice(0, 16);
      } catch {
        /* ignore */
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });

  // —— Pre-judicial ——
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [visitaResultado, setVisitaResultado] = useState("");

  // —— Judicial ——
  const [numeroProceso, setNumeroProceso] = useState("");
  const [predemandaAgotada, setPredemandaAgotada] = useState(false);
  const [evidenciaUrl, setEvidenciaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // —— Cerrado ——
  const [resultadoCierre, setResultadoCierre] = useState("");
  const [detalleCierre, setDetalleCierre] = useState("");

  // —— Castigado ——
  const [justificacionCastigo, setJustificacionCastigo] = useState("");

  const showFormalGates =
    requireFormalGates && isFormalEstado(estadoNuevo);

  const toggleCheck = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const uploadEvidencia = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `legal_cases/${caseData.id}/evidencias/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from("cartera-documentos")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from("cartera-documentos").getPublicUrl(path);
      setEvidenciaUrl(data.publicUrl);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo subir la evidencia.");
    } finally {
      setUploading(false);
    }
  };

  const validateFormalGates = (): string | null => {
    if (!showFormalGates) return null;

    if (estadoNuevo === "pre_judicial") {
      const missing = PRE_JUDICIAL_CHECKLIST.filter((i) => !checklist[i.id]);
      if (missing.length > 0) {
        return "Debes marcar todos los ítems del checklist de documentos verificados.";
      }
      if (!visitaResultado) {
        return "Debes registrar el resultado de la visita domiciliaria.";
      }
    }

    if (estadoNuevo === "judicial") {
      if (!numeroProceso.trim()) {
        return "El número de proceso legal es obligatorio.";
      }
      if (!predemandaAgotada) {
        return "Debes confirmar que se agotó el requerimiento previo (predemanda sin respuesta).";
      }
      if (!evidenciaUrl) {
        return "Debes adjuntar evidencia de la predemanda enviada.";
      }
    }

    if (estadoNuevo === "cerrado") {
      if (!resultadoCierre) {
        return "Debes indicar el resultado final del cierre.";
      }
      if (!detalleCierre.trim()) {
        return "Describe el resultado (monto, vehículo o referencia del acuerdo).";
      }
    }

    if (estadoNuevo === "castigado") {
      if (!justificacionCastigo.trim() || justificacionCastigo.trim().length < 20) {
        return "La justificación de castigo es obligatoria (mín. 20 caracteres) para auditoría.";
      }
    }

    return null;
  };

  const buildAuditDetalle = (): string | null => {
    if (!showFormalGates) return descripcion.trim() || null;

    const lines: string[] = [];

    if (estadoNuevo === "pre_judicial") {
      const docs = PRE_JUDICIAL_CHECKLIST.filter((i) => checklist[i.id])
        .map((i) => i.label)
        .join("; ");
      const visita =
        VISITA_RESULTADOS.find((v) => v.value === visitaResultado)?.label ||
        visitaResultado;
      lines.push(`Checklist documentos: ${docs}`);
      lines.push(`Visita domiciliaria: ${visita}`);
    }

    if (estadoNuevo === "judicial") {
      lines.push(`Nº proceso: ${numeroProceso.trim()}`);
      lines.push("Predemanda enviada y sin respuesta: sí");
      if (evidenciaUrl) lines.push(`Evidencia: ${evidenciaUrl}`);
    }

    if (estadoNuevo === "cerrado") {
      const res =
        CERRADO_RESULTADOS.find((r) => r.value === resultadoCierre)?.label ||
        resultadoCierre;
      lines.push(`Resultado final: ${res}`);
      lines.push(`Detalle: ${detalleCierre.trim()}`);
    }

    if (estadoNuevo === "castigado") {
      lines.push(`Justificación castigo: ${justificacionCastigo.trim()}`);
    }

    if (descripcion.trim()) lines.push(`Nota: ${descripcion.trim()}`);
    return lines.join("\n");
  };

  const onSubmit = async () => {
    if (operativeOnly && isFormalEstado(estadoNuevo)) {
      alert(
        "Los avances Pre-judicial / Judicial / Cerrado / Castigado se registran en la pestaña Formal (3+ meses).",
      );
      return;
    }

    if (!descripcion.trim() && !showFormalGates) {
      alert("Debes justificar por qué cambias el estado.");
      return;
    }
    if (showFormalGates && estadoNuevo === "castigado" && !descripcion.trim()) {
      // castigo usa justificación dedicada; descripción opcional
    } else if (
      showFormalGates &&
      estadoNuevo !== "castigado" &&
      !descripcion.trim() &&
      estadoNuevo !== "pre_judicial" &&
      estadoNuevo !== "judicial" &&
      estadoNuevo !== "cerrado"
    ) {
      alert("Debes justificar por qué cambias el estado.");
      return;
    }

    if (!proximaAccion.trim()) {
      alert("Debes definir una próxima acción.");
      return;
    }

    const gateError = validateFormalGates();
    if (gateError) {
      alert(gateError);
      return;
    }

    setSaving(true);
    try {
      const detalle = buildAuditDetalle();
      const labelEstado = estadoNuevo.replace(/_/g, " ");
      await legalCasesService.changeStatus({
        case_id: caseData.id,
        estado_nuevo: estadoNuevo,
        event_tipo: "sistema",
        event_descripcion: `Cambio de estado a: ${labelEstado}.${descripcion.trim() ? ` ${descripcion.trim()}` : ""}`,
        event_resultado:
          estadoNuevo === "pre_judicial"
            ? VISITA_RESULTADOS.find((v) => v.value === visitaResultado)?.label ||
              null
            : estadoNuevo === "cerrado"
              ? CERRADO_RESULTADOS.find((r) => r.value === resultadoCierre)
                  ?.label || null
              : estadoNuevo === "castigado"
                ? "Castigado / Incobrable"
                : null,
        documento_id: evidenciaUrl,
        proxima_accion: proximaAccion,
        fecha_proxima_accion: new Date(fechaProxima).toISOString(),
        event_detalle: detalle,
        event_canal: "sistema",
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white";
  const labelClass =
    "text-xs font-bold text-slate-500 uppercase tracking-wider";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Cambiar Estado del Expediente
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Estado actual:{" "}
            <span className="font-bold text-slate-700 uppercase">
              {caseData.estado?.replace("_", " ")}
            </span>
            {requireFormalGates && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                <ShieldAlert className="h-3 w-3" />
                Fase formal · evidencias obligatorias
              </span>
            )}
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shrink-0">
          <RefreshCw className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div>
          <label className={labelClass}>Nuevo Estado</label>
          <select
            value={estadoNuevo}
            onChange={(e) => setEstadoNuevo(e.target.value)}
            className={inputClass}
          >
            {operativeOnly ? (
              <>
                <option value="nuevo">Nuevo</option>
                <option value="gestionando">Gestionando</option>
              </>
            ) : (
              <>
                <option value="nuevo">Nuevo</option>
                <option value="gestionando">Gestionando</option>
                <option value="pre_judicial">Pre-Judicial</option>
                <option value="judicial">Judicial</option>
                <option value="cerrado">Cerrado / Resuelto</option>
                <option value="castigado">Castigado / Incobrable</option>
              </>
            )}
          </select>
          {operativeOnly && (
            <p className="mt-1.5 text-xs text-slate-500">
              Para Pre-judicial, Judicial, Cerrado o Castigado usa la pestaña{" "}
              <span className="font-semibold text-slate-700">
                Formal (3+ meses)
              </span>
              .
            </p>
          )}
        </div>

        {/* ——— GATES FORMALES ——— */}
        {showFormalGates && estadoNuevo === "pre_judicial" && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 space-y-5">
            <div className="flex items-center gap-2 text-orange-900">
              <CheckSquare className="h-4 w-4" />
              <h4 className="text-sm font-bold">
                Requisitos para Pre-judicial
              </h4>
            </div>

            <div>
              <p className={labelClass}>Checklist de documentos verificados</p>
              <ul className="mt-2 space-y-2">
                {PRE_JUDICIAL_CHECKLIST.map((item) => (
                  <li key={item.id}>
                    <label className="flex items-start gap-3 rounded-xl border border-orange-100 bg-white px-3 py-2.5 cursor-pointer hover:border-orange-200 transition">
                      <input
                        type="checkbox"
                        checked={!!checklist[item.id]}
                        onChange={() => toggleCheck(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-200"
                      />
                      <span className="text-sm text-slate-800">{item.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className={labelClass}>
                Visita domiciliaria · resultado
              </p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VISITA_RESULTADOS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisitaResultado(opt.value)}
                    className={`h-10 rounded-xl text-sm font-semibold border transition ${
                      visitaResultado === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showFormalGates && estadoNuevo === "judicial" && (
          <div className="rounded-2xl border border-red-200 bg-red-50/30 p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-900">
              <Scale className="h-4 w-4" />
              <h4 className="text-sm font-bold">Requisitos para Judicial</h4>
            </div>

            <div>
              <label className={labelClass}>Número de proceso legal</label>
              <input
                value={numeroProceso}
                onChange={(e) => setNumeroProceso(e.target.value)}
                placeholder="Ej. 12345-2026-JUD"
                className={inputClass}
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-red-100 bg-white px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={predemandaAgotada}
                onChange={(e) => setPredemandaAgotada(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-200"
              />
              <span className="text-sm text-slate-800 leading-snug">
                Confirmo que se agotó el requerimiento previo:{" "}
                <span className="font-semibold">
                  predemanda enviada y sin respuesta
                </span>
                .
              </span>
            </label>

            <div>
              <label className={labelClass}>
                Evidencia de predemanda
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <FileCheck2 className="h-4 w-4" />
                  {uploading ? "Subiendo…" : "Adjuntar archivo"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadEvidencia(f);
                    }}
                  />
                </label>
                {evidenciaUrl && (
                  <a
                    href={evidenciaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700 underline"
                  >
                    Evidencia cargada · ver
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {showFormalGates && estadoNuevo === "cerrado" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-900">
              <FileCheck2 className="h-4 w-4" />
              <h4 className="text-sm font-bold">Resultado final del cierre</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CERRADO_RESULTADOS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResultadoCierre(opt.value)}
                  className={`h-10 rounded-xl text-sm font-semibold border transition ${
                    resultadoCierre === opt.value
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className={labelClass}>
                Detalle del resultado
              </label>
              <input
                value={detalleCierre}
                onChange={(e) => setDetalleCierre(e.target.value)}
                placeholder={
                  resultadoCierre === "monto_recuperado"
                    ? "Monto recuperado (USD)…"
                    : resultadoCierre === "vehiculo_recuperado"
                      ? "Placa / descripción del vehículo…"
                      : "Referencia del acuerdo firmado…"
                }
                className={inputClass}
              />
            </div>
          </div>
        )}

        {showFormalGates && estadoNuevo === "castigado" && (
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Ban className="h-4 w-4" />
              <h4 className="text-sm font-bold">
                Justificación de castigo (auditoría)
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Es plata que se da por perdida. Queda registrado quién lo autorizó
              y por qué.
            </p>
            <textarea
              value={justificacionCastigo}
              onChange={(e) => setJustificacionCastigo(e.target.value)}
              placeholder="¿Por qué no hay nada que recuperar?"
              rows={4}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all resize-none bg-white"
            />
          </div>
        )}

        <div>
          <label className={labelClass}>
            {showFormalGates && estadoNuevo === "castigado"
              ? "Nota adicional (opcional)"
              : "Justificación / Detalles del cambio"}
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Contexto del cambio de estado…"
            rows={3}
            className="mt-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all resize-none"
          />
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="text-sm font-bold text-slate-800">
            Obligatorio: Actualizar próxima acción
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Siguiente paso</label>
              <input
                value={proximaAccion}
                onChange={(e) => setProximaAccion(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
              />
            </div>
            <div>
              <label className={labelClass}>Fecha límite</label>
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
          disabled={saving || uploading}
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
