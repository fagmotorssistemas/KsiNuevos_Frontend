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
import {
  Plus,
  Loader2,
  History,
  Calendar,
  UserCircle,
  StickyNote,
  ChevronUp,
} from "lucide-react";
import { CreateCaseForm } from "./CreateCaseForm";
import { LegalCaseWorkspace } from "./LegalCaseWorkspace";

type PrecaseNote = Awaited<
  ReturnType<typeof legalCasesService.listPrecaseNotes>
>[number];

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
  const [precaseNotes, setPrecaseNotes] = useState<PrecaseNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  const fetchPrecaseNotes = async () => {
    setLoadingNotes(true);
    try {
      const notes = await legalCasesService.listPrecaseNotes(
        legalContext.type === "oracle"
          ? { type: "oracle", clientId: legalContext.clientId }
          : {
              type: "manual",
              carteraManualId: legalContext.carteraManualId,
            },
      );
      setPrecaseNotes(notes);
    } catch (e) {
      console.error("[LegalCasesTab] precase notes:", e);
      setPrecaseNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

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
        await fetchPrecaseNotes();
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalContext]);

  const handleSaveNote = async () => {
    const texto = noteDraft.trim();
    if (!texto) {
      setNoteError("Escribe una observación");
      return false;
    }
    setSavingNote(true);
    setNoteError(null);
    try {
      await legalCasesService.addPrecaseNote(
        legalContext.type === "oracle"
          ? {
              type: "oracle",
              clientId: legalContext.clientId,
              observacion: texto,
            }
          : {
              type: "manual",
              carteraManualId: legalContext.carteraManualId,
              observacion: texto,
            },
      );
      setNoteDraft("");
      await fetchPrecaseNotes();
      setNoteOpen(false);
      return true;
    } catch (e: unknown) {
      setNoteError(
        e instanceof Error ? e.message : "No se pudo guardar la nota",
      );
      return false;
    } finally {
      setSavingNote(false);
    }
  };

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
    const latestNote = precaseNotes[0];

    return (
      <div className="space-y-4">
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 text-center space-y-4 overflow-visible">
          {/* Tarjeta compacta estilo “nota” — esquina derecha */}
          <div className="sm:absolute sm:top-3 sm:right-3 sm:z-10 w-full sm:w-[240px] text-left">
            <div
              className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm transition-shadow ${
                noteOpen ? "shadow-md" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setNoteOpen((v) => !v)}
                className="absolute -top-1 -right-1 z-20 h-8 w-8 rounded-full bg-slate-900 border-[3px] border-white shadow-md flex items-center justify-center text-white hover:bg-slate-800 transition"
                title={noteOpen ? "Cerrar" : "Agregar observación"}
                aria-expanded={noteOpen}
              >
                {noteOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>

              <div className="relative px-4 pt-4 pb-3.5 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 tracking-wide">
                    Antes de aperturar
                  </p>
                  <p className="text-base font-bold text-slate-900 leading-tight mt-0.5 flex items-center gap-1.5">
                    <StickyNote className="h-4 w-4 text-slate-500" />
                    Observación
                  </p>
                  {latestNote ? (
                    <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 leading-snug">
                      {latestNote.observacion}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                      Nota breve si no conviene abrir caso aún
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                    nota
                  </span>
                  {precaseNotes.length > 0 && (
                    <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
                      {precaseNotes.length} guardada
                      {precaseNotes.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {noteOpen && (
                  <div className="pt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => {
                        setNoteDraft(e.target.value);
                        if (noteError) setNoteError(null);
                      }}
                      rows={3}
                      autoFocus
                      placeholder="Ej: cuotas sin dar de baja…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 resize-none"
                    />
                    {noteError && (
                      <p className="text-[10px] text-rose-600 font-medium">
                        {noteError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSaveNote()}
                      disabled={savingNote || !noteDraft.trim()}
                      className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-full bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {savingNote ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <StickyNote className="h-3.5 w-3.5" />
                      )}
                      Guardar nota
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 mx-auto max-w-md">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-500">
              <History className="h-7 w-7" />
            </div>
            <div className="text-center">
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
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition shadow-sm text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Aperturar caso legal
            </button>
          </div>
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
                        ? new Date(nota.fecha).toLocaleString("es-EC")
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
