"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { legalCasesService } from "@/services/legalCases.service";
import type { CaseFullPayload } from "@/types/legal.types";
import { AddEventForm } from "@/components/features/accounting/wallet/AddEventForm";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  History,
  ListTodo,
  RefreshCw,
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
  UserCircle,
  FolderOpen,
  Folder,
  Plus
} from "lucide-react";

const getCanalIcon = (canal: string | null | undefined) => {
  switch (canal) {
    case "telefono": return <Phone className="h-3.5 w-3.5" />;
    case "whatsapp": return <MessageCircle className="h-3.5 w-3.5" />;
    case "email": return <Mail className="h-3.5 w-3.5" />;
    case "presencial": return <MapPin className="h-3.5 w-3.5" />;
    case "sistema": return <Scale className="h-3.5 w-3.5" />;
    default: return <Scale className="h-3.5 w-3.5" />;
  }
};

export default function LegalCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<CaseFullPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingObservation, setIsAddingObservation] = useState(false);
  const [manualNombre, setManualNombre] = useState<string | null>(null);

  // Filtros de navegación
  const [activeTab, setActiveTab] = useState<"todas" | "comunicaciones" | "observaciones" | "tareas" | "sistema">(
    "todas",
  );
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await legalCasesService.getCaseFull(caseId);
      setData(payload);
      
      // Auto-seleccionar el proceso actual si existe
      if (payload?.case?.tipo_proceso) {
        setSelectedProcess(payload.case.tipo_proceso);
      }
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const c = data?.case;

  useEffect(() => {
    const mid = c?.cartera_manual_id;
    if (!mid) {
      setManualNombre(null);
      return;
    }
    (async () => {
      const { data: row } = await supabase
        .from("cartera_manual")
        .select("nombre_completo")
        .eq("id", mid)
        .maybeSingle();
      setManualNombre((row as { nombre_completo?: string } | null)?.nombre_completo ?? null);
    })();
  }, [c?.cartera_manual_id, supabase]);

  // Extraer procesos involucrados en este caso
  const procesosInvolucrados = useMemo(() => {
    if (!data?.etapas) return [];
    
    // Agrupar por tipo_proceso, conservando la primera etapa de cada uno
    const map = new Map<string, { tipo: string, eventosCount: number, primeraEtapaId: string }>();
    
    data.etapas.forEach(etapa => {
      if (!map.has(etapa.tipo_proceso)) {
        const eventsCount = (data.events || []).filter(e => e.etapa_id === etapa.id || data.etapas.find(et => et.id === e.etapa_id)?.tipo_proceso === etapa.tipo_proceso).length;
        map.set(etapa.tipo_proceso, {
          tipo: etapa.tipo_proceso,
          eventosCount: eventsCount,
          primeraEtapaId: etapa.id
        });
      } else {
        const current = map.get(etapa.tipo_proceso)!;
        const eventsCount = (data.events || []).filter(e => e.etapa_id === etapa.id).length;
        current.eventosCount += eventsCount;
      }
    });

    // Agregar el proceso actual incluso si no hay eventos aún
    if (c?.tipo_proceso && !map.has(c.tipo_proceso)) {
      map.set(c.tipo_proceso, { tipo: c.tipo_proceso, eventosCount: 0, primeraEtapaId: "" });
    }

    return Array.from(map.values());
  }, [data?.etapas, data?.events, c?.tipo_proceso]);

  // Etapas del proceso seleccionado (para filtrar eventos de ese proceso)
  const etapasList = useMemo(() => {
    if (!selectedProcess) return [];
    return data?.etapas?.filter(e => e.tipo_proceso === selectedProcess) || [];
  }, [data?.etapas, selectedProcess]);

  const currentProcessStageIds = useMemo(() => {
    return new Set(etapasList.map((e) => e.id));
  }, [etapasList]);

  // Determinar si el proceso seleccionado es el actual o uno histórico
  const isCurrentProcess = selectedProcess === c?.tipo_proceso;

  // Filtrar eventos por proceso seleccionado + pestaña
  const filteredEvents = useMemo(() => {
    if (!data?.events || !selectedProcess) return [];
    
    // Primero filtrar eventos del proceso seleccionado (por etapa_id)
    // Si el evento viene sin etapa_id, se muestra solo cuando se está viendo
    // el proceso actual (normalmente son notas/observaciones del momento).
    const eventsForProcess = data.events.filter((e) => {
      if (!e.etapa_id) return isCurrentProcess;
      return currentProcessStageIds.has(e.etapa_id);
    });

    // Luego filtrar por Pestaña
    switch (activeTab) {
      case "comunicaciones":
        return eventsForProcess.filter(e => 
          ["llamada", "mensaje", "notificacion"].includes(e.tipo?.toLowerCase() || "") ||
          ["telefono", "whatsapp", "email", "presencial"].includes(e.canal?.toLowerCase() || "")
        );
      case "observaciones":
        return eventsForProcess.filter(e => {
          const t = (e.tipo?.toLowerCase() || "").trim();
          return t === "nota" || t.includes("nota");
        });
      case "tareas":
        return eventsForProcess.filter(e => e.tipo?.toLowerCase().includes("tarea"));
      case "sistema":
        return eventsForProcess.filter(e => 
          e.tipo?.toLowerCase() === "sistema" || 
          e.tipo?.toLowerCase() === "creacion" ||
          e.canal?.toLowerCase() === "sistema"
        );
      case "todas":
      default:
        return eventsForProcess;
    }
  }, [data?.events, activeTab, currentProcessStageIds, selectedProcess, isCurrentProcess]);

  const groupedEventsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const e of filteredEvents) {
      const key = e.fecha ? new Date(e.fecha).toLocaleDateString() : "Sin fecha";
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filteredEvents]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* CABECERA DE LA PÁGINA */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/legal/cases"
            className="h-10 w-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center justify-center shadow-sm"
            title="Volver"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Link>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">EXPEDIENTE LEGAL</div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {c
                ? c.id_sistema != null
                  ? `Caso #${c.id_sistema}`
                  : manualNombre
                    ? `Cartera manual · ${manualNombre}`
                    : "Cartera manual"
                : "Cargando..."}
            </h1>
          </div>
        </div>

        <button
          onClick={load}
          className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 text-sm font-bold shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-slate-500 text-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-300" />
          Cargando expediente...
        </div>
      ) : !c ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-slate-500 text-sm text-center">
          No se pudo cargar el caso o no existe.
        </div>
      ) : (
        <div className="space-y-6">
          {/* CARPETAS DE PROCESOS (Folders view) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                Archivos del Expediente
              </h2>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {procesosInvolucrados.length} Procesos
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {procesosInvolucrados.map((proc, index) => {
                const isActive = proc.tipo === selectedProcess;
                const isCurrent = proc.tipo === c.tipo_proceso;
                
                return (
                  <button
                    key={proc.tipo}
                    onClick={() => setSelectedProcess(proc.tipo)}
                    className={`
                      relative text-left p-4 rounded-xl border transition-all duration-200 
                      flex flex-col gap-3 group
                      ${isActive 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md hover:bg-slate-50'
                      }
                    `}
                  >
                    {/* Decoración de carpeta superior */}
                    <div className={`absolute top-0 left-4 w-12 h-2 rounded-t-lg -mt-2 border-t border-x ${
                      isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 group-hover:bg-slate-50 group-hover:border-indigo-200'
                    }`}></div>

                    <div className="flex items-start justify-between">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors'
                      }`}>
                        <Folder className="h-4 w-4" />
                      </div>
                      
                      {isCurrent && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                          ACTUAL
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                        Proceso #{index + 1}
                      </div>
                      <div className={`font-bold capitalize truncate ${isActive ? 'text-indigo-900' : 'text-slate-700 group-hover:text-indigo-900'}`}>
                        {proc.tipo.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 pt-2 border-t border-slate-100">
                      <FileText className="h-3.5 w-3.5" />
                      {proc.eventosCount} {proc.eventosCount === 1 ? 'documento' : 'documentos'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VISTA DEL PROCESO SELECCIONADO */}
          {selectedProcess ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              {/* DOSSIER HEADER (Contexto Fijo del Caso) - Solo se muestra con el proceso ACTUAL o un warning si es histórico */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 border-slate-100 relative">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${isCurrentProcess ? 'bg-slate-900' : 'bg-slate-400'}`}></div>
                  
                  {!isCurrentProcess && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Estás viendo el historial de un proceso anterior ({selectedProcess.replace('_', ' ')}).
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                          ${isCurrentProcess ? (
                            c.estado === 'nuevo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            c.estado === 'gestionando' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            c.estado === 'pre_judicial' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            c.estado === 'judicial' ? 'bg-red-50 text-red-700 border-red-200' :
                            c.estado === 'cerrado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          ) : 'bg-slate-100 text-slate-500 border-slate-200'}
                        `}>
                          ● ESTADO {isCurrentProcess ? "ACTUAL" : "FINAL EN ESTE PROCESO"}: {isCurrentProcess ? c.estado?.replace('_', ' ') : "CERRADO / TRANSICIONADO"}
                        </span>
                        {isCurrentProcess && (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border
                            ${c.riesgo === 'alto' ? 'bg-red-50 text-red-700 border-red-200' : 
                              c.riesgo === 'medio' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-emerald-50 text-emerald-700 border-emerald-200'}
                          `}>
                            Riesgo {c.riesgo}
                          </span>
                        )}
                      </div>
                      <h3 className={`text-2xl font-black tracking-tight ${isCurrentProcess ? 'text-slate-900' : 'text-slate-600'}`}>
                        {isCurrentProcess ? 'Info. General del Caso' : `Contexto: ${selectedProcess.replace('_', ' ')}`}
                      </h3>
                    </div>
                    
                    {/* Próxima Acción Destacada - Solo si es el proceso actual */}
                    {isCurrentProcess && (
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
                    )}
                  </div>

                  {/* Grid de Contexto */}
                  <div className={`grid grid-cols-2 lg:grid-cols-6 gap-6 pl-2 ${isCurrentProcess ? 'opacity-100' : 'opacity-60'}`}>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Scale className="h-3 w-3" /> Tipo Proceso
                      </div>
                      <div className="text-sm font-semibold text-slate-800 capitalize">
                        {selectedProcess.replace('_', ' ')}
                      </div>
                    </div>
                    {isCurrentProcess && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* RESULTADOS DEL FILTRO (Bitácora) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm border border-indigo-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Documentos del proceso: <span className="uppercase text-indigo-700">{selectedProcess.replace("_", " ")}</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">Ordenado por fecha para presentación y auditoría.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-slate-600">
                      {filteredEvents.length} eventos encontrados
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCurrentProcess) {
                          alert("Solo puedes agregar observaciones en el proceso actual.");
                          return;
                        }
                        setActiveTab("observaciones");
                        setIsAddingObservation(true);
                      }}
                      className="h-9 px-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition text-xs font-bold shadow-sm inline-flex items-center gap-2"
                      title="Agregar observación"
                    >
                      <Plus className="h-4 w-4" />
                      + Observación
                    </button>
                  </div>
                </div>

                {/* Navegación de Pestañas de la Bitácora */}
                <div className="flex border-b border-slate-200 bg-white px-2">
                  <button
                    onClick={() => setActiveTab("todas")}
                    className={`flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "todas" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <History className="h-4 w-4" /> Todo
                    {activeTab === "todas" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-700"></div>}
                  </button>
                  <button
                    onClick={() => setActiveTab("comunicaciones")}
                    className={`flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "comunicaciones" ? "text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <MessageCircle className="h-4 w-4" /> Comunicaciones
                    {activeTab === "comunicaciones" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700"></div>}
                  </button>
                  <button
                    onClick={() => setActiveTab("observaciones")}
                    className={`flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${
                      activeTab === "observaciones" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <FileText className="h-4 w-4" /> Observaciones
                    {activeTab === "observaciones" && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-700"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("tareas")}
                    className={`flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "tareas" ? "text-amber-700" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <ListTodo className="h-4 w-4" /> Tareas
                    {activeTab === "tareas" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-700"></div>}
                  </button>
                  <button
                    onClick={() => setActiveTab("sistema")}
                    className={`flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === "sistema" ? "text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Scale className="h-4 w-4" /> Sistema
                    {activeTab === "sistema" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-800"></div>}
                  </button>
                </div>
                
                <div className="p-8 space-y-6 bg-slate-50/30">
                  {isAddingObservation && isCurrentProcess && (
                    <div className="max-w-4xl mx-auto">
                      <AddEventForm
                        caseId={caseId}
                        mode="observacion"
                        onCancel={() => setIsAddingObservation(false)}
                        onSuccess={() => {
                          setIsAddingObservation(false);
                          load();
                        }}
                      />
                    </div>
                  )}
                  {filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                      <FileText className="h-12 w-12 opacity-20 mb-4" />
                      <p className="text-sm font-medium">No hay documentos para este filtro en el proceso {selectedProcess.replace('_', ' ')}.</p>
                      {activeTab === "observaciones" && isCurrentProcess && !isAddingObservation && (
                        <button
                          type="button"
                          onClick={() => setIsAddingObservation(true)}
                          className="mt-4 h-10 px-4 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-bold inline-flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar primera observación
                        </button>
                      )}
                    </div>
                  ) : (
                    groupedEventsByDate.map(([dateLabel, items]) => (
                      <div key={dateLabel} className="space-y-4">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {dateLabel}
                        </div>
                        {items.map((e) => (
                          <div key={e.id} className="relative pl-8 max-w-4xl mx-auto">
                            <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-white border-2 border-slate-300 shadow-sm flex items-center justify-center text-slate-500 z-10">
                              {getCanalIcon(e.canal)}
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                              <div className={`px-5 py-3 border-b flex items-center justify-between ${
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
                                  <span className="text-[10px] font-bold text-indigo-700 capitalize bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    {selectedProcess.replace("_", " ")}
                                  </span>
                                </div>
                                <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded shadow-sm border border-slate-100">
                                  <Clock className="h-3 w-3" />
                                  {e.fecha ? new Date(e.fecha).toLocaleTimeString() : "—"}
                                </div>
                              </div>

                              <div className="p-5 space-y-4">
                                <p className="text-[15px] font-semibold text-slate-800 leading-snug">
                                  {e.descripcion || "—"}
                                </p>

                                {e.detalle && (
                                  <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 italic border-l-4 border-l-slate-400 shadow-inner">
                                    "{e.detalle}"
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 border-dashed">
                                  {e.resultado ? (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Resultado: {e.resultado.replace('_', ' ')}
                                    </div>
                                  ) : <div></div>}

                                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <UserCircle className="h-4 w-4" />
                                    Usuario ID: {e.usuario_id?.substring(0,8) || "Sistema"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 border-dashed p-16 flex flex-col items-center justify-center text-slate-400">
              <FolderOpen className="h-16 w-16 mb-4 opacity-20" />
              <p className="font-medium text-slate-500">Selecciona una carpeta arriba</p>
              <p className="text-sm">Para ver el historial y documentos del proceso</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

