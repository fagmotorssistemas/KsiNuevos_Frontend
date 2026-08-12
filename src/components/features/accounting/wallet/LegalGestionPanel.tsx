"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, StickyNote } from "lucide-react";
import { LegalCasesTab } from "./LegalCasesTab";
import type { LegalCaseContext } from "@/types/legal.types";
import type { NotaGestion } from "@/types/wallet.types";

/** Misma regla que el kanban: Alta / Formal = ≥90 días (3+ meses). */
export const DIAS_MORA_FORMAL = 90;

export function LegalGestionPanel({
  legalContext,
  defaultMontoReferenciaForNewCase,
  /** Días de mora del cliente/obligación (kanban Temprana/Media/Alta). */
  diasMora = 0,
  /** Notas Oracle para mostrar historial aunque no haya caso legal. */
  historialExterno = [],
}: {
  legalContext: LegalCaseContext;
  defaultMontoReferenciaForNewCase?: number | null;
  diasMora?: number;
  historialExterno?: NotaGestion[];
}) {
  const operativaBloqueada = diasMora >= DIAS_MORA_FORMAL;
  const [legalSubTab, setLegalSubTab] = useState<"operativa" | "formal">(
    operativaBloqueada ? "formal" : "operativa",
  );

  useEffect(() => {
    if (operativaBloqueada) setLegalSubTab("formal");
  }, [operativaBloqueada]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Gestión legal
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {legalSubTab === "operativa"
              ? operativaBloqueada
                ? "Ventana temprana/media cerrada"
                : "Cobranza temprana y media"
              : "Pipeline formal · mora 3+ meses"}
          </p>
        </div>

        <div className="flex p-1 bg-white rounded-full border border-slate-200 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setLegalSubTab("operativa")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              legalSubTab === "operativa"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Temprana / Media
          </button>
          <button
            type="button"
            onClick={() => setLegalSubTab("formal")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              legalSubTab === "formal"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Formal (3+ meses)
          </button>
        </div>
      </div>

      {legalSubTab === "operativa" && operativaBloqueada ? (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 sm:p-10 space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              Temprana / Media bloqueada
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Este cliente ya superó los{" "}
              <strong>2 meses de mora</strong> ({diasMora} días · 3+ meses).
              La gestión suave de Temprana/Media ya no aplica.
            </p>
          </div>

          <div className="max-w-lg mx-auto rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 flex gap-3 text-left">
            <StickyNote className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Nota
              </p>
              <p className="text-sm text-amber-950/90 mt-0.5">
                No se gestionó el lapso de dos meses (Temprana/Media). Continúa
                por <strong>Formal (3+ meses)</strong>.
              </p>
            </div>
          </div>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setLegalSubTab("formal")}
              className="inline-flex items-center h-10 px-5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition text-sm font-semibold shadow-sm"
            >
              Ir a Formal (3+ meses)
            </button>
          </div>
        </div>
      ) : (
        <LegalCasesTab
          key={legalSubTab}
          legalContext={legalContext}
          defaultMontoReferenciaForNewCase={defaultMontoReferenciaForNewCase}
          operativeOnly={legalSubTab === "operativa"}
          requireFormalGates={legalSubTab === "formal"}
          historialExterno={historialExterno}
        />
      )}
    </div>
  );
}
