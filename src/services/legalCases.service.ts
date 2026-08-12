import { createClient } from '@/lib/supabase/client';
import type {
  CaseFullPayload,
  CaseStepSkipRow,
  LegalCaseActorBrief,
} from '@/types/legal.types';
import {
  canAccessStep as canAccessFormalStep,
  completedTiposFromEvents,
  getSkippedPreviousSteps as getSkippedPreviousFormalSteps,
  type SkipMotivo,
  SKIP_MOTIVOS,
} from '@/components/features/accounting/wallet/formalStepAccess';
import {
  inferPoderEspecialFromEvents,
  type PoderEspecialStatus,
} from '@/components/features/accounting/wallet/legalGestionCatalogs';

async function fetchActorsForCasePayload(
  supabase: ReturnType<typeof createClient>,
  payload: CaseFullPayload,
): Promise<Record<string, LegalCaseActorBrief>> {
  const ids = new Set<string>();
  for (const e of payload.events ?? []) {
    if (e.usuario_id) ids.add(e.usuario_id);
  }
  for (const h of payload.status_history ?? []) {
    if (h.usuario_id) ids.add(h.usuario_id);
  }
  for (const s of payload.step_skips ?? []) {
    if (s.usuario_id) ids.add(s.usuario_id);
  }
  if (ids.size === 0) return {};
  const list = [...ids];
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('id', list);
  if (error) {
    console.error('[legalCases] profiles lookup:', error);
    return {};
  }
  const actors: Record<string, LegalCaseActorBrief> = {};
  for (const p of profiles ?? []) {
    actors[p.id] = { full_name: p.full_name ?? null, role: p.role ?? null };
  }
  return actors;
}

async function fetchStepSkips(
  supabase: ReturnType<typeof createClient>,
  caseId: string,
): Promise<CaseStepSkipRow[]> {
  const { data, error } = await (supabase as any)
    .from('case_step_skips')
    .select(
      'id, case_id, step_saltado, step_ejecutado, motivo, detalle_texto, usuario_id, created_at',
    )
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[legalCases] step_skips lookup:', error);
    return [];
  }
  return (data ?? []) as CaseStepSkipRow[];
}

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
    const payload = data as unknown as CaseFullPayload;
    const step_skips = await fetchStepSkips(supabase, case_id);
    const withSkips: CaseFullPayload = { ...payload, step_skips };
    // El RPC ya devuelve `actors` (mapa id → nombre/rol); enriquecer con autores de saltos.
    const actors = await fetchActorsForCasePayload(supabase, withSkips);
    return {
      ...withSkips,
      actors: { ...(payload.actors ?? {}), ...actors },
    };
  },

  canAccessStep(
    stepKey: string,
    poder: PoderEspecialStatus | null,
  ): boolean {
    return canAccessFormalStep(stepKey, poder);
  },

  getSkippedPreviousSteps(
    stepKey: string,
    events: { tipo?: string | null }[],
    poder: PoderEspecialStatus | null = null,
  ): string[] {
    return getSkippedPreviousFormalSteps(
      stepKey,
      completedTiposFromEvents(events),
      poder,
    );
  },

  /** Equivalente a POST .../steps/:stepKey/check-skip */
  async checkStepSkip(input: {
    case_id: string;
    stepKey: string;
    events?: { tipo?: string | null; detalle?: string | null; fecha?: string }[];
  }): Promise<{ needsWarning: false } | { needsWarning: true; skippedSteps: string[] }> {
    let events = input.events;
    let poder: PoderEspecialStatus | null = null;
    if (!events) {
      const full = await this.getCaseFull(input.case_id);
      events = full.events ?? [];
    }
    poder = inferPoderEspecialFromEvents(events);
    const skippedSteps = getSkippedPreviousFormalSteps(
      input.stepKey,
      completedTiposFromEvents(events),
      poder,
    );
    if (skippedSteps.length === 0) return { needsWarning: false };
    return { needsWarning: true, skippedSteps };
  },

  /** Equivalente a POST .../steps/:stepKey/register-skip */
  async registerStepSkip(input: {
    case_id: string;
    stepKey: string;
    motivo: SkipMotivo | string;
    detalle_texto?: string | null;
    skippedSteps: string[];
  }): Promise<{ ok: true }> {
    if (!SKIP_MOTIVOS.includes(input.motivo as SkipMotivo)) {
      throw new Error('Motivo de salto inválido');
    }
    if (input.motivo === 'otro' && !String(input.detalle_texto || '').trim()) {
      throw new Error('Debes especificar el detalle cuando el motivo es «Otro»');
    }
    if (!input.skippedSteps?.length) {
      throw new Error('No hay pasos saltados para registrar');
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Sesión no válida');

    const rows = input.skippedSteps.map((step_saltado) => ({
      case_id: input.case_id,
      step_saltado,
      step_ejecutado: input.stepKey,
      motivo: input.motivo,
      detalle_texto:
        input.motivo === 'otro'
          ? String(input.detalle_texto).trim()
          : input.detalle_texto?.trim() || null,
      usuario_id: user.id,
    }));

    const { error } = await (supabase as any).from('case_step_skips').insert(rows);
    if (error) throw error;
    return { ok: true };
  },

  /** GET /legal-cases/reports/skips?desde=&hasta= */
  async reportStepSkips(input: {
    desde: string;
    hasta: string;
  }): Promise<
    {
      usuario_id: string;
      motivo: string;
      total: number;
      full_name?: string | null;
      role?: string | null;
    }[]
  > {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('case_step_skips')
      .select('usuario_id, motivo')
      .gte('created_at', input.desde)
      .lte('created_at', input.hasta);
    if (error) throw error;

    const rows = (data ?? []) as { usuario_id: string; motivo: string }[];
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = `${row.usuario_id}::${row.motivo}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const userIds = [...new Set(rows.map((r) => r.usuario_id))];
    const actors: Record<string, LegalCaseActorBrief> = {};
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        actors[p.id] = { full_name: p.full_name ?? null, role: p.role ?? null };
      }
    }

    return [...counts.entries()].map(([key, total]) => {
      const [usuario_id, motivo] = key.split('::');
      return {
        usuario_id,
        motivo,
        total,
        full_name: actors[usuario_id]?.full_name ?? null,
        role: actors[usuario_id]?.role ?? null,
      };
    });
  },
};

