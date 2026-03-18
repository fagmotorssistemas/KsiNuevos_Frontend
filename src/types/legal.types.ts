export type CaseEstado = string;
export type CasePrioridad = string;
export type CaseRiesgo = string;

export interface ProcesoEtapaRow {
  id: string; // uuid
  tipo_proceso: string;
  nombre: string;
  orden: number;
  created_at: string;
}

export interface LegalCaseRow {
  id: string; // uuid
  id_sistema: number;
  estado: CaseEstado | null;
  prioridad: CasePrioridad | null;
  riesgo: CaseRiesgo | null;
  abogado_id: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  fecha_inicio: string | null;
  fecha_ultima_gestion: string | null;
  monto_referencia: number | null;
  tipo_proceso: string | null;
  estado_vehiculo: string | null;
  objetivo_caso: string | null;
  intencion_pago: string | null;
  contactabilidad: string | null;
  etapa_actual_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CaseEventRow {
  id: string; // uuid
  case_id: string;
  tipo: string | null;
  descripcion: string | null;
  resultado: string | null;
  usuario_id: string | null;
  fecha: string; // now()
  documento_id: string | null;
  imagenes_ids: string[] | null;
  canal?: string | null;
  detalle?: string | null;
  etapa_id?: string | null;
}

export interface CaseTaskRow {
  id: string; // uuid
  case_id: string;
  tipo: string | null;
  descripcion: string | null;
  fecha_limite: string;
  estado: 'pendiente' | 'completado' | 'vencido' | string;
  usuario_id: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface CaseStatusHistoryRow {
  id: string; // uuid
  case_id: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  usuario_id: string | null;
  fecha: string;
}

export interface CaseFullPayload {
  case: LegalCaseRow | null;
  events: CaseEventRow[];
  tasks_pending: CaseTaskRow[];
  status_history: CaseStatusHistoryRow[];
  etapas: ProcesoEtapaRow[];
}

