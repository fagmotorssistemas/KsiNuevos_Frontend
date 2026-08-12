"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { legalCasesService } from "@/services/legalCases.service";
import type {
  CaseFullPayload,
  LegalCaseContext,
  LegalCaseRow,
} from "@/types/legal.types";
import type { NotaGestion } from "@/types/wallet.types";
import { Plus, Loader2, History, Calendar, UserCircle } from "lucide-react";
import { CreateCaseForm } from "./CreateCaseForm";
import { LegalCaseWorkspace } from "./LegalCaseWorkspace";

export function LegalCasesTab({
  legalContext,
  defaultMontoReferenciaForNewCase,
  operativeOnly = false,
  requireFormalGates = false,
  /** Notas Oracle / gestiones previas (visibles aunque aún no haya caso legal). */
  historialExterno = [],
}: {
  legalContext: LegalCaseContext;
  defaultMontoReferenciaForNewCase?: number | null;
  operativeOnly?: boolean;
  requireFormalGates?: boolean;
  historialExterno?: NotaGestion[];
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
    const notas = [...historialExterno].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-500">
            <History className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Sin caso legal
            </h3>
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

        {notas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <h4 className="text-sm font-bold text-slate-900">
                Historial previo (sistema / equipo)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Gestiones ya hechas por otros usuarios — revísalas antes de
                llamar de nuevo
              </p>
            </div>
            <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
              {notas.map((nota, idx) => (
                <div
                  key={`${nota.fecha}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                      <UserCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {nota.usuario || "Usuario"}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {nota.fecha
                        ? new Date(nota.fecha).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {nota.observacion || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
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
      historialExterno={historialExterno}
      onRefresh={() => fetchCase({ silent: true })}
    />
  );
}
