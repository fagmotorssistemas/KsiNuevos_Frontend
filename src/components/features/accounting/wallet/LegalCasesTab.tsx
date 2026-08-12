"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { legalCasesService } from "@/services/legalCases.service";
import type {
  CaseFullPayload,
  LegalCaseContext,
  LegalCaseRow,
} from "@/types/legal.types";
import { Plus, Loader2, History } from "lucide-react";
import { CreateCaseForm } from "./CreateCaseForm";
import { LegalCaseWorkspace } from "./LegalCaseWorkspace";

export function LegalCasesTab({
  legalContext,
  defaultMontoReferenciaForNewCase,
  operativeOnly = false,
  requireFormalGates = false,
}: {
  legalContext: LegalCaseContext;
  defaultMontoReferenciaForNewCase?: number | null;
  operativeOnly?: boolean;
  requireFormalGates?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [caseRow, setCaseRow] = useState<LegalCaseRow | null>(null);
  const [data, setData] = useState<CaseFullPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  /** silent: no desmontar el workspace (evita perder panel/formulario al refrescar). */
  const fetchCase = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    try {
      let q = supabase.from("cases").select("*");
      if (legalContext.type === "oracle") {
        q = q.eq("id_sistema", legalContext.clientId);
      } else {
        q = q.eq("cartera_manual_id", legalContext.carteraManualId);
      }
      const { data: cases, error } = await q
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error(error);
        return;
      }

      if (cases && cases.length > 0) {
        setCaseRow(cases[0]);
        try {
          const payload = await legalCasesService.getCaseFull(cases[0].id);
          setData(payload);
        } catch (err) {
          console.error(err);
        }
      } else {
        setCaseRow(null);
        setData(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalContext]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col justify-center items-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mb-2 text-violet-500" />
        <p className="text-sm">Cargando expediente…</p>
      </div>
    );
  }

  if (!caseRow && !isCreating) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-500">
          <History className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Sin caso legal</h3>
          <p className="text-sm text-slate-500 mt-1">
            {legalContext.type === "oracle"
              ? "Este cliente no tiene un caso de gestión legal abierto."
              : "Esta obligación manual no tiene un caso legal abierto."}
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition shadow-sm text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Aperturar caso legal
        </button>
      </div>
    );
  }

  if (isCreating) {
    return (
      <CreateCaseForm
        {...(legalContext.type === "oracle"
          ? { source: "oracle" as const, clientId: legalContext.clientId }
          : {
              source: "manual" as const,
              carteraManualId: legalContext.carteraManualId,
              defaultMontoReferencia: defaultMontoReferenciaForNewCase ?? null,
            })}
        onCancel={() => setIsCreating(false)}
        onSuccess={fetchCase}
      />
    );
  }

  if (!caseRow || !data?.case) return null;

  return (
    <LegalCaseWorkspace
      legalContext={legalContext}
      caseRow={caseRow}
      data={data}
      pipeline={requireFormalGates ? "formal" : "operativa"}
      operativeOnly={operativeOnly}
      requireFormalGates={requireFormalGates}
      onRefresh={() => fetchCase({ silent: true })}
    />
  );
}
