"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { legalCasesService } from "@/services/legalCases.service";
import type {
  CaseFullPayload,
  LegalCaseContext,
  LegalCaseRow,
} from "@/types/legal.types";
import {
  Plus,
  Loader2,
  CalendarClock,
  History,
  ListTodo,
  FileText,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Scale,
  Target,
  Car,
  Banknote,
  PhoneOff,
  Activity,
  UserCircle
} from "lucide-react";
import { CreateCaseForm } from "./CreateCaseForm";
import { AddEventForm } from "./AddEventForm";

import { ChangeStatusForm } from "./ChangeStatusForm";
import { AddTaskForm } from "./AddTaskForm";
import { ChangeProcessForm } from "./ChangeProcessForm";

const getCanalIcon = (canal: string | null | undefined) => {
  switch (canal) {
    case "telefono":
      return <Phone className="h-3.5 w-3.5" />;
    case "whatsapp":
      return <MessageCircle className="h-3.5 w-3.5" />;
    case "email":
      return <Mail className="h-3.5 w-3.5" />;
    case "presencial":
      return <MapPin className="h-3.5 w-3.5" />;
    case "sistema":
      return <Scale className="h-3.5 w-3.5" />;
    default:
      return <Scale className="h-3.5 w-3.5" />;
  }
};

export function LegalCasesTab({
  legalContext,
  defaultMontoReferenciaForNewCase,
}: {
  legalContext: LegalCaseContext;
  /** Solo cartera manual: prellenar monto referencia al crear caso. */
  defaultMontoReferenciaForNewCase?: number | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [caseRow, setCaseRow] = useState<LegalCaseRow | null>(null);
  const [data, setData] = useState<CaseFullPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // Create mode state
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isAddingObservation, setIsAddingObservation] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isChangingProcess, setIsChangingProcess] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState<string | null>(null);

  // Pestañas para la Bitácora de Gestiones
  const [activeTab, setActiveTab] = useState<
    "todas" | "comunicaciones" | "observaciones" | "tareas" | "sistema"
  >("todas");

  // IDs de etapas del tipo de proceso ACTUAL.
  // Esto permite ocultar eventos heredados del proceso anterior.
  const currentProcessStageIds = useMemo(() => {
    return new Set((data?.etapas ?? []).map((e) => e.id));
  }, [data?.etapas]);

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    
    // Solo eventos de etapas del proceso actual.
    // Si un evento no tiene etapa_id, se considera heredado/antiguo y no se muestra.
    const eventsByProcess =
      currentProcessStageIds.size === 0
        ? data.events
        : data.events.filter((e) => e.etapa_id && currentProcessStageIds.has(e.etapa_id));

    // Filtro por Pestaña
    switch (activeTab) {
      case "comunicaciones":
        return eventsByProcess.filter(e => 
          ["llamada", "mensaje", "notificacion"].includes(e.tipo?.toLowerCase() || "") ||
          ["telefono", "whatsapp", "email", "presencial"].includes(e.canal?.toLowerCase() || "")
        );
      case "observaciones":
        return eventsByProcess.filter((e) => {
          const t = (e.tipo?.toLowerCase() || "").trim();
          return t === "nota" || t.includes("nota");
        });
      case "tareas":
        return eventsByProcess.filter(e => 
          e.tipo?.toLowerCase().includes("tarea")
        );
      case "sistema":
        return eventsByProcess.filter(e => 
          e.tipo?.toLowerCase() === "sistema" || 
          e.tipo?.toLowerCase() === "creacion" ||
          e.canal?.toLowerCase() === "sistema"
        );
      case "todas":
      default:
        return eventsByProcess;
    }
  }, [data?.events, activeTab, currentProcessStageIds]);

  const fetchCase = async () => {
    setLoading(true);
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
      setLoading(false);
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
    setLoading(false);
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!confirm("¿Marcar esta tarea como completada?")) return;
    setIsCompletingTask(taskId);
    try {
      await legalCasesService.completeTask({ task_id: taskId, event_descripcion: "Tarea marcada como completada manualmente" });
      await fetchCase();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al completar la tarea");
    } finally {
      setIsCompletingTask(null);
    }
  };

  useEffect(() => {
    fetchCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalContext]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col justify-center items-center text-slate-500 animate-pulse">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p className="text-sm">Buscando expediente legal...</p>
      </div>
    );
  }

  if (!caseRow && !isCreating) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
          <History className="h-8 w-8 text-slate-300" />
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
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition shadow-md text-sm font-semibold"
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

  const c = data?.case;
  if (!c) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* DOSSIER HEADER (Contexto del Caso) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row">
        {/* Lado izquierdo: Info Principal */}
        <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                  ${c.estado === 'nuevo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    c.estado === 'gestionando' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    c.estado === 'pre_judicial' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    c.estado === 'judicial' ? 'bg-red-50 text-red-700 border-red-200' :
                    c.estado === 'cerrado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-slate-100 text-slate-800 border-slate-200'
                  }
                `}>
                  ● ESTADO: {c.estado?.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border
                  ${c.riesgo === 'alto' ? 'bg-red-50 text-red-700 border-red-200' : 
                    c.riesgo === 'medio' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    'bg-emerald-50 text-emerald-700 border-emerald-200'}
                `}>
                  Riesgo {c.riesgo}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {legalContext.type === "oracle" ? (
                  <>Expediente #{c.id_sistema}</>
                ) : (
                  <>
                    Cartera manual · Ref.{" "}
                    <span className="font-mono text-lg">
                      {c.cartera_manual_id?.slice(0, 8)}…
                    </span>
                  </>
                )}
              </h3>
            </div>
            
            {/* Próxima Acción Destacada */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full sm:w-64 shrink-0 shadow-inner">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <CalendarClock className="h-4 w-4 text-slate-700" />
                Próxima Acción Requerida
              </div>
              <div className="text-sm font-bold text-slate-900 leading-snug">
                {c.proxima_accion || "—"}
              </div>
              <div className="text-xs text-slate-600 font-mono mt-2 bg-white px-2 py-1 border border-slate-200 rounded inline-block">
                {c.fecha_proxima_accion ? new Date(c.fecha_proxima_accion).toLocaleString() : "—"}
              </div>
            </div>
          </div>

          {/* Grid de Contexto */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 pl-2">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Scale className="h-3 w-3" /> Tipo Proceso
              </div>
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {c.tipo_proceso?.replace('_', ' ') || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Target className="h-3 w-3" /> Objetivo
              </div>
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {c.objetivo_caso?.replace('_', ' ') || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Car className="h-3 w-3" /> Vehículo
              </div>
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {c.estado_vehiculo?.replace('_', ' ') || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Intención Pago
              </div>
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {c.intencion_pago || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <PhoneOff className="h-3 w-3" /> Contactabilidad
              </div>
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {c.contactabilidad?.replace('_', ' ') || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Prioridad
              </div>
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {c.prioridad || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Lado derecho: Acciones Rápidas */}
        <div className="w-full md:w-64 bg-slate-50 p-6 flex flex-col justify-center gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Acciones del Expediente
          </div>
          <button
            onClick={() => setIsAddingEvent(true)}
            className="w-full h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
          >
            <Plus className="h-4 w-4" />
            Añadir Gestión
          </button>
          <button
            onClick={() => setIsAddingObservation(true)}
            className="w-full h-11 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Añadir Observación
          </button>
          <button
            onClick={() => setIsChangingStatus(true)}
            className="w-full h-11 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <History className="h-4 w-4" />
            Cambiar Estado
          </button>
          <button
            onClick={() => setIsChangingProcess(true)}
            className="w-full h-11 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <Scale className="h-4 w-4" />
            Cambiar Proceso
          </button>
        </div>
      </div>

      {isAddingEvent ? (
        <AddEventForm
          caseId={c.id}
          onCancel={() => setIsAddingEvent(false)}
          onSuccess={() => {
            setIsAddingEvent(false);
            fetchCase();
          }}
        />
      ) : isAddingObservation ? (
        <AddEventForm
          caseId={c.id}
          mode="observacion"
          onCancel={() => setIsAddingObservation(false)}
          onSuccess={() => {
            setIsAddingObservation(false);
            setActiveTab("observaciones");
            fetchCase();
          }}
        />
      ) : isChangingStatus ? (
        <ChangeStatusForm
          caseData={c}
          onCancel={() => setIsChangingStatus(false)}
          onSuccess={() => {
            setIsChangingStatus(false);
            fetchCase();
          }}
        />
      ) : isChangingProcess ? (
        <ChangeProcessForm
          caseData={c}
          onCancel={() => setIsChangingProcess(false)}
          onSuccess={() => {
            setIsChangingProcess(false);
            fetchCase();
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* EVENTOS (TIMELINE TIPO DOCUMENTO) - Ocupa 2 columnas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm border border-indigo-200 shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 pr-2">
                <h2 className="text-sm md:text-base font-bold text-slate-900 truncate">
                  Bitácora de Gestiones
                </h2>
              </div>
            </div>
            <span className="text-[10px] md:text-xs font-bold bg-white px-2 md:px-3 py-1 rounded-full border border-slate-200 shadow-sm text-slate-600 shrink-0">
              {filteredEvents.length} eventos
            </span>
          </div>

          {/* Navegación de Pestañas de la Bitácora */}
          <div className="flex border-b border-slate-200 bg-white px-2">
            <button
              onClick={() => setActiveTab("todas")}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "todas" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              <History className="h-3.5 w-3.5" /> Todo
              {activeTab === "todas" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900"></div>}
            </button>
            <button
              onClick={() => setActiveTab("comunicaciones")}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "comunicaciones" ? "text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Comunicaciones
              {activeTab === "comunicaciones" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700"></div>}
            </button>
            <button
              onClick={() => setActiveTab("observaciones")}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${
                activeTab === "observaciones"
                  ? "text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Observaciones
              {activeTab === "observaciones" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-700"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("tareas")}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "tareas" ? "text-amber-700" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ListTodo className="h-3.5 w-3.5" /> Tareas
              {activeTab === "tareas" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-700"></div>}
            </button>
            <button
              onClick={() => setActiveTab("sistema")}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "sistema" ? "text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Scale className="h-3.5 w-3.5" /> Sistema
              {activeTab === "sistema" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-800"></div>}
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/30">
            {filteredEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <FileText className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No hay registros en esta categoría.</p>
              </div>
            ) : (
              filteredEvents.map((e, idx) => (
                <div key={e.id} className="relative pl-8">
                  {/* Linea del timeline */}
                  {idx !== filteredEvents.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-slate-200"></div>
                  )}
                  {/* Punto del timeline con icono */}
                  <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-white border-2 border-slate-300 shadow-sm flex items-center justify-center text-slate-500 z-10">
                    {getCanalIcon(e.canal)}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                    {/* Cabecera del evento */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${
                      e.tipo?.toLowerCase().includes("tarea") ? "bg-amber-50/80 border-amber-100" :
                      e.tipo?.toLowerCase() === "sistema" || e.tipo?.toLowerCase() === "creacion" ? "bg-slate-100/80 border-slate-200" :
                      "bg-blue-50/50 border-blue-100"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wide ${
                          e.tipo?.toLowerCase().includes("tarea") ? "text-amber-800" :
                          e.tipo?.toLowerCase() === "sistema" || e.tipo?.toLowerCase() === "creacion" ? "text-slate-700" :
                          "text-blue-800"
                        }`}>
                          {activeTab === "observaciones" &&
                          (e.tipo?.toLowerCase() || "").includes("nota")
                            ? "Observación"
                            : e.tipo?.replace('_', ' ') || "evento"}
                        </span>
                        {e.canal && (
                          <span className="text-[10px] font-bold text-slate-500 capitalize bg-white/60 px-2 py-0.5 rounded shadow-sm">
                            {e.canal}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {e.fecha ? new Date(e.fecha).toLocaleString() : "—"}
                      </div>
                    </div>
                    
                    {/* Cuerpo del evento */}
                    <div className="p-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {e.descripcion || "—"}
                      </p>
                      
                      {e.detalle && (
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic border-l-2 border-l-slate-400">
                          "{e.detalle}"
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        {e.resultado ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {e.resultado}
                          </div>
                        ) : <div></div>}
                        
                        {/* Pequeña info de usuario (simulada o real si estuviera en la query) */}
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <UserCircle className="h-3.5 w-3.5" />
                          Registrado por usuario
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: TAREAS E HISTORIAL */}
        <div className="flex flex-col gap-6">
          {/* TAREAS PENDIENTES */}
          <div className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 ${isAddingTask ? 'min-h-[400px]' : 'max-h-[350px]'}`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/30 rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-amber-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Tareas / Checklists
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                {data?.tasks_pending?.length ?? 0} pendientes
              </span>
            </div>
            
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              {!isAddingTask ? (
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="w-full text-xs font-semibold text-slate-600 bg-white border border-slate-200 border-dashed rounded-lg py-2 hover:bg-slate-100 transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva tarea
                </button>
              ) : (
                <AddTaskForm
                  caseId={c.id}
                  onCancel={() => setIsAddingTask(false)}
                  onSuccess={() => {
                    setIsAddingTask(false);
                    fetchCase();
                  }}
                />
              )}
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {(data?.tasks_pending ?? []).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-4">
                  <CheckCircle2 className="h-8 w-8 opacity-20 text-emerald-500" />
                  <p className="text-xs text-center">Sin tareas pendientes.</p>
                </div>
              ) : (
                (data?.tasks_pending ?? []).map((t) => (
                  <div
                    key={t.id}
                    className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300 transition-all flex items-start gap-3 relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${t.estado === "vencido" ? "bg-red-500" : "bg-amber-400"}`}></div>
                    
                    <button 
                      onClick={() => handleCompleteTask(t.id)}
                      disabled={isCompletingTask === t.id}
                      className="mt-0.5 shrink-0 h-5 w-5 rounded border-2 border-slate-300 flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 transition disabled:opacity-50"
                      title="Marcar como completada"
                    >
                      {isCompletingTask === t.id ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" /> : <CheckCircle2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {t.tipo || "tarea"}
                        </div>
                        <div className={`text-[9px] font-bold uppercase px-1.5 rounded ${t.estado === "vencido" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {t.estado}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 leading-tight">
                        {t.descripcion || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        Vence: {t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* HISTORIAL ESTADOS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[250px]">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 rounded-t-xl">
              <History className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Línea de Estados
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar relative">
              <div className="absolute left-[27px] top-6 bottom-4 w-px bg-slate-100"></div>

              <div className="space-y-4 relative">
                {(data?.status_history ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 relative z-10">
                    No hay cambios de estado aún.
                  </p>
                ) : (
                  (data?.status_history ?? []).map((h) => (
                    <div key={h.id} className="flex gap-3 relative z-10">
                      <div className="shrink-0 mt-1 h-3 w-3 rounded-full border-2 border-slate-300 bg-white z-10"></div>
                      <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-medium text-slate-500 line-through">
                            {h.estado_anterior?.replace("_", " ") || "inicio"}
                          </span>
                          <span className="text-slate-300 text-xs">➔</span>
                          <span className="text-xs font-bold text-slate-800 uppercase">
                            {h.estado_nuevo?.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {h.fecha ? new Date(h.fecha).toLocaleString() : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}