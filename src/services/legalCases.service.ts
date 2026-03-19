import { createClient } from '@/lib/supabase/client';
import type { CaseFullPayload } from '@/types/legal.types';

export const legalCasesService = {
  async createCase(input: {
    id_sistema?: number | null;
    cartera_manual_id?: string | null;
    estado: string;
    prioridad?: string | null;
    riesgo?: string | null;
    abogado_id?: string | null;
    proxima_accion: string;
    fecha_proxima_accion: string; // ISO
    monto_referencia?: number | null;
    tipo_proceso: string;
    estado_vehiculo: string;
    objetivo_caso: string;
    intencion_pago?: string | null;
    contactabilidad?: string | null;
    event?: {
      tipo?: string;
      descripcion?: string;
      resultado?: string | null;
      documento_id?: string | null;
      imagenes_ids?: string[] | null;
      canal?: string | null;
      detalle?: string | null;
    };
  }): Promise<string> {
    const supabase = createClient();
    const { data, error } = await (supabase.rpc as any)('rpc_create_case', {
      p_id_sistema: input.id_sistema ?? null,
      p_cartera_manual_id: input.cartera_manual_id ?? null,
      p_estado: input.estado,
      p_prioridad: input.prioridad ?? null,
      p_riesgo: input.riesgo ?? null,
      p_abogado_id: input.abogado_id ?? null,
      p_proxima_accion: input.proxima_accion,
      p_fecha_proxima_accion: input.fecha_proxima_accion,
      p_monto_referencia: input.monto_referencia ?? null,
      p_tipo_proceso: input.tipo_proceso,
      p_estado_vehiculo: input.estado_vehiculo,
      p_objetivo_caso: input.objetivo_caso,
      p_intencion_pago: input.intencion_pago ?? null,
      p_contactabilidad: input.contactabilidad ?? null,
      p_event_tipo: input.event?.tipo ?? 'creacion',
      p_event_descripcion: input.event?.descripcion ?? 'Caso creado',
      p_event_resultado: input.event?.resultado ?? null,
      p_documento_id: input.event?.documento_id ?? null,
      p_imagenes_ids: input.event?.imagenes_ids ?? null,
      p_event_canal: input.event?.canal ?? 'sistema',
      p_event_detalle: input.event?.detalle ?? null,
    });
    if (error) throw error;
    return data as unknown as string;
  },

  async registerEvent(input: {
    case_id: string;
    tipo: string;
    descripcion: string;
    resultado?: string | null;
    documento_id?: string | null;
    imagenes_ids?: string[] | null;
    proxima_accion?: string | null;
    fecha_proxima_accion?: string | null;
    canal?: string | null;
    detalle?: string | null;
  }): Promise<string> {
    const supabase = createClient();
    const { data, error } = await (supabase.rpc as any)('rpc_register_case_event', {
      p_case_id: input.case_id,
      p_tipo: input.tipo,
      p_descripcion: input.descripcion,
      p_resultado: input.resultado ?? null,
      p_documento_id: input.documento_id ?? null,
      p_imagenes_ids: input.imagenes_ids ?? null,
      p_proxima_accion: input.proxima_accion ?? null,
      p_fecha_proxima_accion: input.fecha_proxima_accion ?? null,
      p_canal: input.canal ?? null,
      p_detalle: input.detalle ?? null,
    });
    if (error) throw error;
    return data as unknown as string;
  },

  async changeStatus(input: {
    case_id: string;
    estado_nuevo: string;
    event_tipo: string;
    event_descripcion: string;
    event_resultado?: string | null;
    documento_id?: string | null;
    imagenes_ids?: string[] | null;
    proxima_accion: string;
    fecha_proxima_accion: string;
    event_canal?: string | null;
    event_detalle?: string | null;
  }): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase.rpc as any)('rpc_change_case_status', {
      p_case_id: input.case_id,
      p_estado_nuevo: input.estado_nuevo,
      p_event_tipo: input.event_tipo,
      p_event_descripcion: input.event_descripcion,
      p_event_resultado: input.event_resultado ?? null,
      p_documento_id: input.documento_id ?? null,
      p_imagenes_ids: input.imagenes_ids ?? null,
      p_proxima_accion: input.proxima_accion,
      p_fecha_proxima_accion: input.fecha_proxima_accion,
      p_event_canal: input.event_canal ?? null,
      p_event_detalle: input.event_detalle ?? null,
    });
    if (error) throw error;
  },

  async changeProcess(input: {
    case_id: string;
    tipo_proceso: string;
    objetivo_caso: string;
    estado_vehiculo: string;
    intencion_pago?: string | null;
    contactabilidad?: string | null;
    proxima_accion: string;
    fecha_proxima_accion: string;
    event_descripcion: string;
  }): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase.rpc as any)('rpc_change_case_process', {
      p_case_id: input.case_id,
      p_tipo_proceso: input.tipo_proceso,
      p_objetivo_caso: input.objetivo_caso,
      p_estado_vehiculo: input.estado_vehiculo,
      p_intencion_pago: input.intencion_pago ?? null,
      p_contactabilidad: input.contactabilidad ?? null,
      p_proxima_accion: input.proxima_accion,
      p_fecha_proxima_accion: input.fecha_proxima_accion,
      p_event_descripcion: input.event_descripcion,
    });
    if (error) throw error;
  },

  async createTask(input: {
    case_id: string;
    tipo: string;
    descripcion: string;
    fecha_limite: string;
  }): Promise<string> {
    const supabase = createClient();
    const { data, error } = await (supabase.rpc as any)('rpc_create_case_task', {
      p_case_id: input.case_id,
      p_tipo: input.tipo,
      p_descripcion: input.descripcion,
      p_fecha_limite: input.fecha_limite,
    });
    if (error) throw error;
    return data as unknown as string;
  },

  async completeTask(input: { task_id: string; event_descripcion?: string }): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase.rpc as any)('rpc_complete_case_task', {
      p_task_id: input.task_id,
      p_event_descripcion: input.event_descripcion ?? 'Tarea completada',
    });
    if (error) throw error;
  },

  async markOverdueTasks(): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('mark_overdue_case_tasks');
    if (error) throw error;
    return (data as unknown as number) ?? 0;
  },

  async getCaseFull(case_id: string): Promise<CaseFullPayload> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('rpc_get_case_full', { p_case_id: case_id });
    if (error) throw error;
    return data as unknown as CaseFullPayload;
  },
};

