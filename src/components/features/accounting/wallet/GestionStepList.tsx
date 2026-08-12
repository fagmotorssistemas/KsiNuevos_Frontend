"use client";

import { useMemo } from "react";
import {
  Check,
  ChevronRight,
  Phone,
  MessageCircle,
  MapPin,
  HandCoins,
  Bell,
  FileSearch,
  Home,
  ScrollText,
  Scale,
  KeyRound,
  Flag,
  type LucideIcon,
} from "lucide-react";
import {
  OPERATIVA_TIPOS,
  FORMAL_TIPOS,
  type LegalPipeline,
  type PoderEspecialStatus,
  type GestionTipoOption,
} from "./legalGestionCatalogs";
import { canAccessStep } from "./formalStepAccess";

type StepStatus = "completado" | "en_curso" | "pendiente" | "bloqueado";

const ICONS: Record<string, LucideIcon> = {
  llamada: Phone,
  whatsapp: MessageCircle,
  visita_cortesia: MapPin,
  acuerdo_pago: HandCoins,
  recordatorio: Bell,
  verificacion: FileSearch,
  visita_domiciliaria: Home,
  predemanda: ScrollText,
  recuperacion_administrativa: KeyRound,
  via_judicial: Scale,
  cierre: Flag,
};

function shortLabel(t: GestionTipoOption) {
  return t.label.replace(/^\d+[A-B]?\.\s*/, "");
}

function statusOf(
  tipo: string,
  pipeline: LegalPipeline,
  done: Set<string>,
  current: string | null,
  poder: PoderEspecialStatus | null,
): StepStatus {
  if (pipeline === "formal") {
    if (!canAccessStep(tipo, poder)) {
      return "bloqueado";
    }
    if (done.has(tipo)) return "completado";
    if (current === tipo) return "en_curso";
    return "pendiente";
  }
  // Operativa: no hay progreso secuencial — solo selección
  return "pendiente";
}

function Badge({ status }: { status: StepStatus }) {
  const map = {
    completado: "bg-emerald-100 text-emerald-700",
    en_curso: "bg-violet-100 text-violet-700",
    pendiente: "bg-slate-100 text-slate-500",
    bloqueado: "bg-slate-50 text-slate-400",
  } as const;
  const label = {
    completado: "Hecho",
    en_curso: "Actual",
    pendiente: "Pendiente",
    bloqueado: "Bloqueado",
  } as const;
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

export function GestionStepList({
  pipeline,
  events = [],
  poderEspecial = null,
  selectedTipo,
  onSelect,
  variant = "panel",
}: {
  pipeline: LegalPipeline;
  events?: { tipo?: string | null }[];
  poderEspecial?: PoderEspecialStatus | null;
  selectedTipo?: string;
  onSelect: (tipo: string) => void;
  /** Menú compacto flotante solo para elegir tipo */
  variant?: "panel" | "menu";
}) {
  const steps =
    pipeline === "formal" ? FORMAL_TIPOS : OPERATIVA_TIPOS;

  const done = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      const t = (e.tipo || "").toLowerCase().trim();
      if (t) s.add(t);
    }
    return s;
  }, [events]);

  const current = useMemo(() => {
    if (pipeline !== "formal") return null;
    for (const t of FORMAL_TIPOS) {
      if (!canAccessStep(t.value, poderEspecial)) continue;
      if (!done.has(t.value)) return t.value;
    }
    return null;
  }, [pipeline, done, poderEspecial]);

  if (variant === "menu") {
    return (
      <div className="w-full bg-black text-white rounded-md shadow-2xl overflow-hidden border border-white/10">
        {steps.map((t, i) => {
          const st = statusOf(
            t.value,
            pipeline,
            done,
            current,
            poderEspecial,
          );
          const blocked = st === "bloqueado";
          return (
            <button
              key={t.value}
              type="button"
              disabled={blocked}
              onClick={() => !blocked && onSelect(t.value)}
              className={`w-full py-3.5 px-4 text-center text-sm font-medium transition ${
                i > 0 ? "border-t border-white/15" : ""
              } ${
                blocked
                  ? "text-white/35 cursor-not-allowed"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {shortLabel(t)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {pipeline === "formal" ? "Pasos del proceso" : "Tipo de gestión"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {pipeline === "formal"
              ? "Selecciona el paso a registrar"
              : "Elige cómo vas a gestionar"}
          </p>
        </div>
        {pipeline === "formal" && (
          <span
            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
              poderEspecial === "vigente"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-violet-50 text-violet-600"
            }`}
          >
            {poderEspecial
              ? `Poder ${poderEspecial.replace("_", " ")}`
              : "Poder s/d"}
          </span>
        )}
      </div>

      <div className="px-3 pb-4 space-y-1.5 flex-1 overflow-y-auto">
        {steps.map((t) => {
          const Icon = ICONS[t.value] || FileSearch;
          const st = statusOf(
            t.value,
            pipeline,
            done,
            current,
            poderEspecial,
          );
          const selected = selectedTipo === t.value;
          const blocked = st === "bloqueado";

          return (
            <button
              key={t.value}
              type="button"
              disabled={blocked}
              onClick={() => !blocked && onSelect(t.value)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition border ${
                selected
                  ? "bg-violet-50 border-violet-200 shadow-sm"
                  : blocked
                    ? "bg-slate-50/50 border-transparent opacity-50 cursor-not-allowed"
                    : "bg-slate-50/80 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selected
                    ? "bg-violet-600 text-white"
                    : st === "completado"
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {st === "completado" && !selected ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {shortLabel(t)}
                  </p>
                  {pipeline === "formal" && t.step != null && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {t.step}
                      {t.route || ""}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {t.evidenciaHint ||
                    (pipeline === "operativa"
                      ? "Cobranza suave"
                      : "Evidencia requerida")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {pipeline === "formal" && <Badge status={st} />}
                {!blocked && (
                  <ChevronRight
                    className={`h-4 w-4 ${selected ? "text-violet-600" : "text-slate-300"}`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
