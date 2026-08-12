"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { LegalCasesTab } from "./LegalCasesTab";
import type { LegalCaseContext } from "@/types/legal.types";
import type { NotaGestion } from "@/types/wallet.types";

/** Referencia kanban: columna Alta = ≥90 días. No bloquea Temprana/Media. */
export const DIAS_MORA_FORMAL = 90;

export function LegalGestionPanel({
  legalContext,
  defaultMontoReferenciaForNewCase,
  /** Días de mora del cliente/obligación. */
  diasMora = 0,
  /** Notas Oracle para mostrar historial aunque no haya caso legal. */
  historialExterno = [],
}: {
  legalContext: LegalCaseContext;
  defaultMontoReferenciaForNewCase?: number | null;
  diasMora?: number;
  historialExterno?: NotaGestion[];
}) {
  // Por defecto Temprana/Media: ahí están las gestiones ya hechas.
  // Formal es pipeline aparte (recién se empieza).
  const [legalSubTab, setLegalSubTab] = useState<"operativa" | "formal">(
    "operativa",
  );

  const sugerirFormal = diasMora >= DIAS_MORA_FORMAL;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Gestión legal
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {legalSubTab === "operativa"
              ? "Cobranza temprana y media · gestiones previas"
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

      {sugerirFormal && legalSubTab === "operativa" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex gap-3 items-start">
          <Info className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">
            Este cliente tiene <strong>{diasMora} días de mora</strong>. Las
            gestiones ya hechas están aquí en Temprana/Media. Cuando quieras
            iniciar el proceso nuevo, usa la pestaña{" "}
            <strong>Formal (3+ meses)</strong>.
          </p>
        </div>
      )}

      <LegalCasesTab
        key={`${legalContext.type}-${legalContext.type === "oracle" ? legalContext.clientId : legalContext.carteraManualId}-${legalSubTab}`}
        legalContext={legalContext}
        defaultMontoReferenciaForNewCase={defaultMontoReferenciaForNewCase}
        operativeOnly={legalSubTab === "operativa"}
        requireFormalGates={legalSubTab === "formal"}
        historialExterno={historialExterno}
      />
    </div>
  );
}
