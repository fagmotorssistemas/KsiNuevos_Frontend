"use client";

import { useState } from "react";
import { LegalCasesTab } from "./LegalCasesTab";
import type { LegalCaseContext } from "@/types/legal.types";

export function LegalGestionPanel({
  legalContext,
  defaultMontoReferenciaForNewCase,
}: {
  legalContext: LegalCaseContext;
  defaultMontoReferenciaForNewCase?: number | null;
}) {
  const [legalSubTab, setLegalSubTab] = useState<"operativa" | "formal">(
    "operativa",
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Gestión Legal de Cartera
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {legalSubTab === "operativa"
              ? "Gestión temprana y media: bitácora, tareas y seguimiento operativo."
              : "Proceso formal (3+ meses): avances de fase con evidencias obligatorias."}
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLegalSubTab("operativa")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              legalSubTab === "operativa"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Temprana / Media
          </button>
          <button
            type="button"
            onClick={() => setLegalSubTab("formal")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              legalSubTab === "formal"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Formal (3+ meses)
          </button>
        </div>
      </div>

      {legalSubTab === "formal" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Evidencias obligatorias:</span>{" "}
          Pre-judicial (checklist + visita), Judicial (nº proceso + predemanda),
          Cerrado (resultado) y Castigado (justificación de auditoría). Sin eso
          no avanza la fase.
        </div>
      )}

      <LegalCasesTab
        legalContext={legalContext}
        defaultMontoReferenciaForNewCase={defaultMontoReferenciaForNewCase}
        operativeOnly={legalSubTab === "operativa"}
        requireFormalGates={legalSubTab === "formal"}
      />
    </div>
  );
}
