/**
 * Acceso y saltos del pipeline formal (Gestión Legal).
 * Progreso "completado" = existe al menos un case_event con ese tipo.
 */

import { FORMAL_TIPOS, type PoderEspecialStatus } from "./legalGestionCatalogs";

export const FORMAL_STEP_ORDER = [
  "verificacion",
  "visita_domiciliaria",
  "predemanda",
  "recuperacion_administrativa",
  "via_judicial",
  "cierre",
] as const;

export type FormalStepKey = (typeof FORMAL_STEP_ORDER)[number];

export const SKIP_MOTIVOS = [
  "ya_hecho_antes",
  "caso_urgente",
  "cliente_inubicable",
  "otro",
] as const;

export type SkipMotivo = (typeof SKIP_MOTIVOS)[number];

export const SKIP_MOTIVO_LABELS: Record<SkipMotivo, string> = {
  ya_hecho_antes: "Ya se hizo antes de usar el sistema",
  caso_urgente: "Caso urgente, no hay tiempo de esperar",
  cliente_inubicable: "Cliente inubicable, no aplica",
  otro: "Otro (especificar)",
};

const BRANCH_STEPS = new Set([
  "recuperacion_administrativa",
  "via_judicial",
]);

export function isFormalStepKey(v: string): v is FormalStepKey {
  return (FORMAL_STEP_ORDER as readonly string[]).includes(v);
}

export function formalStepLabel(stepKey: string): string {
  const found = FORMAL_TIPOS.find((t) => t.value === stepKey);
  if (found) return found.label.replace(/^\d+[A-B]?\.\s*/, "");
  return stepKey.replace(/_/g, " ");
}

/** Bloqueo duro solo en bifurcación 4A/4B según poder especial. */
export function canAccessStep(
  stepKey: string,
  poder: PoderEspecialStatus | null,
): boolean {
  if (stepKey === "recuperacion_administrativa") {
    return poder === "vigente";
  }
  if (stepKey === "via_judicial") {
    // poder_vigente === false. null = aún no definido → bloqueado
    return poder === "vencido" || poder === "no_existe";
  }
  return true;
}

/**
 * Pasos anteriores incompletos respecto al orden del pipeline.
 * 4A y 4B son mutuamente excluyentes; no se exigen entre sí.
 */
export function getSkippedPreviousSteps(
  stepKey: string,
  completedTipos: Set<string> | Iterable<string>,
  poder: PoderEspecialStatus | null = null,
): string[] {
  const done =
    completedTipos instanceof Set
      ? completedTipos
      : new Set(
          [...completedTipos].map((t) => String(t).toLowerCase().trim()),
        );

  const linear = [
    "verificacion",
    "visita_domiciliaria",
    "predemanda",
  ] as const;

  let requiredBefore: string[] = [];

  if (stepKey === "verificacion") {
    requiredBefore = [];
  } else if (stepKey === "visita_domiciliaria") {
    requiredBefore = ["verificacion"];
  } else if (stepKey === "predemanda") {
    requiredBefore = ["verificacion", "visita_domiciliaria"];
  } else if (BRANCH_STEPS.has(stepKey)) {
    requiredBefore = [...linear];
  } else if (stepKey === "cierre") {
    requiredBefore = [...linear];
    if (poder === "vigente") {
      requiredBefore.push("recuperacion_administrativa");
    } else if (poder === "vencido" || poder === "no_existe") {
      requiredBefore.push("via_judicial");
    } else {
      const hasBranch =
        done.has("recuperacion_administrativa") || done.has("via_judicial");
      if (!hasBranch) {
        requiredBefore.push("via_judicial");
      }
    }
  } else {
    return [];
  }

  return requiredBefore.filter((s) => !done.has(s));
}

export function completedTiposFromEvents(
  events: { tipo?: string | null }[],
): Set<string> {
  const s = new Set<string>();
  for (const e of events) {
    const t = (e.tipo || "").toLowerCase().trim();
    if (t) s.add(t);
  }
  return s;
}
