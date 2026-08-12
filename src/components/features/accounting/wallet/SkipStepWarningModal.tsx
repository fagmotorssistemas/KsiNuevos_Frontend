"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  SKIP_MOTIVOS,
  SKIP_MOTIVO_LABELS,
  formalStepLabel,
  type SkipMotivo,
} from "./formalStepAccess";

const MOTIVO_OPTIONS = SKIP_MOTIVOS.map((m) => ({
  value: m,
  label: SKIP_MOTIVO_LABELS[m],
}));

function MotivoSelect({
  value,
  onChange,
}: {
  value: SkipMotivo | "";
  onChange: (value: SkipMotivo) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = MOTIVO_OPTIONS.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`w-full min-h-11 px-4 py-2.5 rounded-xl border bg-white text-sm text-left outline-none flex items-center justify-between gap-2 transition ${
          open
            ? "border-amber-400 ring-4 ring-amber-50"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span
          className={`leading-snug ${
            selected ? "text-slate-800 font-medium" : "text-slate-400"
          }`}
        >
          {selected?.label || "Seleccionar motivo…"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-[90] left-0 right-0 top-[calc(100%+6px)] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <ul className="py-1.5" role="listbox">
            {MOTIVO_OPTIONS.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-3 text-left text-sm flex items-start justify-between gap-3 transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-amber-50/80"
                    }`}
                  >
                    <span className="font-medium leading-snug">{opt.label}</span>
                    {active && <Check className="h-4 w-4 shrink-0 mt-0.5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SkipStepWarningModal({
  skippedSteps,
  onCancel,
  onConfirm,
}: {
  skippedSteps: string[];
  onCancel: () => void;
  onConfirm: (input: {
    motivo: SkipMotivo;
    detalle_texto?: string;
  }) => Promise<void> | void;
}) {
  const [motivo, setMotivo] = useState<SkipMotivo | "">("");
  const [detalle, setDetalle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const names = skippedSteps.map(formalStepLabel).join(", ");

  const submit = async () => {
    if (saving) return;
    if (!motivo) {
      setError("Selecciona un motivo");
      return;
    }
    if (motivo === "otro" && !detalle.trim()) {
      setError("Especifica el detalle");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm({
        motivo,
        detalle_texto: detalle.trim() || undefined,
      });
      // El padre cierra el modal al abrir el formulario; no resetear saving
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar el salto");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-100">
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 rounded-t-2xl">
          <p className="text-sm font-bold text-amber-900">
            Este expediente no tiene completado: {names}
          </p>
          <p className="text-xs text-amber-800/80 mt-1">
            ¿Por qué se está saltando este paso?
          </p>
        </div>
        <div className="p-5 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Motivo
            </label>
            <MotivoSelect
              value={motivo}
              onChange={(v) => {
                setMotivo(v);
                setError(null);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {motivo === "otro"
                ? "Escribe tu razón"
                : "Tu razón (opcional)"}
              {motivo === "otro" && (
                <span className="text-amber-700 normal-case font-medium">
                  {" "}
                  *
                </span>
              )}
            </label>
            <textarea
              value={detalle}
              onChange={(e) => {
                setDetalle(e.target.value);
                setError(null);
              }}
              rows={3}
              placeholder={
                motivo === "otro"
                  ? "Describe por qué se salta este paso…"
                  : "Si quieres, escribe el detalle con tus palabras…"
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Continuar de todas formas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
