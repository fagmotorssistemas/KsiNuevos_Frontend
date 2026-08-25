import { createClient } from '@/lib/supabase/client';
import {
  FORMAL_PROGRESS_TIPOS,
  ecuadorDayBounds,
  ecuadorYmd,
  weekSaturdayToFriday,
  type FormalDailyProgressPayload,
  type FormalProgressCategoryId,
  type FormalProgressCategoryRow,
  type FormalProgressEventRow,
  type FormalProgressTipo,
  type FormalProgressTrendPoint,
} from '@/types/formal-progress.types';

const OPEN_ESTADOS = ['nuevo', 'gestionando', 'pre_judicial', 'judicial'] as const;

const TIPO_LABEL: Record<FormalProgressTipo, string> = {
  verificacion: 'Verificación',
  visita_domiciliaria: 'Visita domiciliaria',
  predemanda: 'Predemanda',
  recuperacion_administrativa: 'Recuperación administrativa',
  via_judicial: 'Vía judicial',
  cierre: 'Cierre',
};

const FORMAL_SET = new Set<string>(FORMAL_PROGRESS_TIPOS);

type CaseLite = {
  id: string;
  id_sistema: number | null;
  cartera_manual_id: string | null;
  estado: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  created_at: string | null;
};

type EventLite = {
  id: string;
  case_id: string;
  tipo: string | null;
  descripcion: string | null;
  resultado: string | null;
  detalle: string | null;
  fecha: string;
  usuario_id: string | null;
};

type SkipLite = {
  id: string;
  case_id: string;
  step_saltado: string;
  step_ejecutado: string;
  motivo: string;
  detalle_texto: string | null;
  usuario_id: string;
  created_at: string;
};

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((num / den) * 100)));
}

function isFormalTipo(tipo: string | null | undefined): tipo is FormalProgressTipo {
  return !!tipo && FORMAL_SET.has(tipo.toLowerCase().trim());
}

function clientLabel(
  row: { id_sistema: number | null; cartera_manual_id: string | null },
  names: Map<string, string>,
): string {
  if (row.cartera_manual_id) {
    return names.get(row.cartera_manual_id) || 'Cartera manual';
  }
  if (row.id_sistema != null) return `Cliente #${row.id_sistema}`;
  return 'Expediente';
}

async function fetchOpenCases(
  supabase: ReturnType<typeof createClient>,
): Promise<CaseLite[]> {
  const { data, error } = await supabase
    .from('cases')
    .select(
      'id, id_sistema, cartera_manual_id, estado, proxima_accion, fecha_proxima_accion, created_at',
    )
    .in('estado', [...OPEN_ESTADOS])
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as CaseLite[];
}

async function fetchEventsInRange(
  supabase: ReturnType<typeof createClient>,
  start: string,
  end: string,
): Promise<EventLite[]> {
  const { data, error } = await supabase
    .from('case_events')
    .select('id, case_id, tipo, descripcion, resultado, detalle, fecha, usuario_id')
    .in('tipo', [...FORMAL_PROGRESS_TIPOS])
    .gte('fecha', start)
    .lt('fecha', end)
    .order('fecha', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as EventLite[];
}

async function fetchSkipsInRange(
  supabase: ReturnType<typeof createClient>,
  start: string,
  end: string,
): Promise<SkipLite[]> {
  const { data, error } = await supabase
    .from('case_step_skips')
    .select(
      'id, case_id, step_saltado, step_ejecutado, motivo, detalle_texto, usuario_id, created_at',
    )
    .gte('created_at', start)
    .lt('created_at', end)
    .limit(2000);
  if (error) {
    console.error('[formalProgress] case_step_skips:', error);
    return [];
  }
  return (data ?? []) as SkipLite[];
}

async function fetchNames(
  supabase: ReturnType<typeof createClient>,
  cases: CaseLite[],
  userIds: string[],
): Promise<{ people: Map<string, string>; manuals: Map<string, string> }> {
  const people = new Map<string, string>();
  const manuals = new Map<string, string>();
  const uniqueUsers = [...new Set(userIds.filter(Boolean))];
  const manualIds = [
    ...new Set(cases.map((c) => c.cartera_manual_id).filter(Boolean) as string[]),
  ];

  if (uniqueUsers.length) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uniqueUsers);
    for (const p of data ?? []) {
      if (p.full_name) people.set(p.id, p.full_name);
    }
  }

  if (manualIds.length) {
    const { data } = await supabase
      .from('cartera_manual')
      .select('id, nombre_completo')
      .in('id', manualIds);
    for (const row of data ?? []) {
      manuals.set(row.id, row.nombre_completo);
    }
  }

  return { people, manuals };
}

function agendaDueIds(cases: CaseLite[], day: string): Set<string> {
  const ids = new Set<string>();
  for (const c of cases) {
    if (!c.fecha_proxima_accion) continue;
    const due = ecuadorYmd(c.fecha_proxima_accion);
    if (due && due <= day) ids.add(c.id);
  }
  return ids;
}

function dayEvents(events: EventLite[], day: string): EventLite[] {
  return events.filter((e) => ecuadorYmd(e.fecha) === day);
}

function buildPayload(
  day: string,
  cases: CaseLite[],
  events: EventLite[],
  skips: SkipLite[],
): FormalDailyProgressPayload {
  const week = weekSaturdayToFriday(day);
  const due = agendaDueIds(cases, day);
  const todayEv = dayEvents(events, day);
  const advanced = new Set(todayEv.map((e) => e.case_id));
  const doneAgenda = [...due].filter((id) => advanced.has(id)).length;
  const cobertura = pct(doneAgenda, due.size);
  const cierres = new Set(
    todayEv.filter((e) => e.tipo === 'cierre').map((e) => e.case_id),
  ).size;
  const aperturas = cases.filter((c) => c.created_at && ecuadorYmd(c.created_at) === day).length;
  const saltosHoy = skips.filter((s) => ecuadorYmd(s.created_at) === day).length;

  const categorias: FormalProgressCategoryRow[] = FORMAL_PROGRESS_TIPOS.map((tipo) => {
    const cantidad = new Set(
      todayEv.filter((e) => e.tipo === tipo).map((e) => e.case_id),
    ).size;
    return {
      categoria: tipo,
      label: TIPO_LABEL[tipo],
      cantidad,
      total: Math.max(advanced.size, 1),
    };
  });

  categorias.push({
    categoria: 'aperturas',
    label: 'Expedientes abiertos hoy',
    cantidad: aperturas,
    total: Math.max(aperturas, 1),
  });
  categorias.push({
    categoria: 'saltos',
    label: 'Saltos de paso',
    cantidad: saltosHoy,
    total: Math.max(saltosHoy, 1),
  });

  const tendencia: FormalProgressTrendPoint[] = week.map((fecha) => {
    const dDue = agendaDueIds(cases, fecha);
    const dEv = dayEvents(events, fecha);
    const dAdv = new Set(dEv.map((e) => e.case_id));
    const dDone = [...dDue].filter((id) => dAdv.has(id)).length;
    return {
      fecha,
      cobertura: pct(dDone, dDue.size),
      casos_avanzados: dAdv.size,
      agenda_due: dDue.size,
      agenda_done: dDone,
    };
  });

  return {
    fecha: day,
    casos_avanzados: advanced.size,
    agenda_due: due.size,
    agenda_done: doneAgenda,
    cobertura,
    cierres,
    aperturas,
    saltos: saltosHoy,
    expedientes_abiertos: cases.length,
    categorias,
    tendencia,
  };
}

export const formalProgressService = {
  tipoLabel(tipo: string): string {
    const key = tipo.toLowerCase().trim() as FormalProgressTipo;
    return TIPO_LABEL[key] || tipo.replace(/_/g, ' ');
  },

  async getDailyProgress(fecha: string): Promise<FormalDailyProgressPayload> {
    const day = fecha.slice(0, 10);
    const week = weekSaturdayToFriday(day);
    const rangeStart = ecuadorDayBounds(week[0]).start;
    const rangeEnd = ecuadorDayBounds(week[6]).end;
    const supabase = createClient();

    const [cases, events, skips] = await Promise.all([
      fetchOpenCases(supabase),
      fetchEventsInRange(supabase, rangeStart, rangeEnd),
      fetchSkipsInRange(supabase, rangeStart, rangeEnd),
    ]);

    return buildPayload(day, cases, events, skips);
  },

  async getCategoryEvents(
    fecha: string,
    categoria: FormalProgressCategoryId,
  ): Promise<FormalProgressEventRow[]> {
    const day = fecha.slice(0, 10);
    const { start, end } = ecuadorDayBounds(day);
    const supabase = createClient();

    const [cases, events, skips] = await Promise.all([
      fetchOpenCases(supabase),
      fetchEventsInRange(supabase, start, end),
      categoria === 'saltos'
        ? fetchSkipsInRange(supabase, start, end)
        : Promise.resolve([] as SkipLite[]),
    ]);

    const caseById = new Map(cases.map((c) => [c.id, c]));
    const todayEv = dayEvents(events, day).filter((e) => isFormalTipo(e.tipo));

    const extraIds: string[] = [];
    if (categoria === 'saltos') {
      for (const s of skips) extraIds.push(s.usuario_id, s.case_id);
    }
    for (const e of todayEv) {
      if (e.usuario_id) extraIds.push(e.usuario_id);
    }

    const missingCaseIds = [
      ...new Set([
        ...todayEv.map((e) => e.case_id),
        ...skips.map((s) => s.case_id),
      ]),
    ].filter((id) => !caseById.has(id));

    if (missingCaseIds.length) {
      const { data } = await supabase
        .from('cases')
        .select(
          'id, id_sistema, cartera_manual_id, estado, proxima_accion, fecha_proxima_accion, created_at',
        )
        .in('id', missingCaseIds);
      for (const row of (data ?? []) as CaseLite[]) caseById.set(row.id, row);
    }

    const allCases = [...caseById.values()];
    const { people, manuals } = await fetchNames(
      supabase,
      allCases,
      [
        ...todayEv.map((e) => e.usuario_id || ''),
        ...skips.map((s) => s.usuario_id),
        ...extraIds,
      ],
    );

    const toEventRow = (
      e: EventLite,
      titulo?: string,
      pendiente?: boolean,
    ): FormalProgressEventRow => {
      const c = caseById.get(e.case_id);
      return {
        occurred_at: e.fecha,
        case_id: e.case_id,
        id_sistema: c?.id_sistema ?? null,
        cartera_manual_id: c?.cartera_manual_id ?? null,
        cliente_nombre: c ? clientLabel(c, manuals) : 'Expediente',
        titulo: titulo || this.tipoLabel(e.tipo || ''),
        detalle: e.detalle || e.descripcion,
        resultado: e.resultado,
        usuario_nombre: e.usuario_id ? people.get(e.usuario_id) || null : null,
        pendiente,
      };
    };

    if (categoria === 'agenda') {
      const due = agendaDueIds(cases, day);
      const rows: FormalProgressEventRow[] = [];
      for (const id of due) {
        const c = caseById.get(id);
        if (!c) continue;
        const ev = todayEv.find((e) => e.case_id === id);
        if (ev) {
          rows.push(toEventRow(ev, `${this.tipoLabel(ev.tipo || '')} · agenda cumplida`));
        } else {
          rows.push({
            occurred_at: c.fecha_proxima_accion || day,
            case_id: c.id,
            id_sistema: c.id_sistema,
            cartera_manual_id: c.cartera_manual_id,
            cliente_nombre: clientLabel(c, manuals),
            titulo: c.proxima_accion || 'Acción programada',
            detalle: 'Sin gestión formal este día',
            resultado: null,
            usuario_nombre: null,
            pendiente: true,
          });
        }
      }
      rows.sort((a, b) => Number(!!a.pendiente) - Number(!!b.pendiente));
      return rows;
    }

    if (categoria === 'aperturas') {
      return cases
        .filter((c) => c.created_at && ecuadorYmd(c.created_at) === day)
        .map((c) => ({
          occurred_at: c.created_at || day,
          case_id: c.id,
          id_sistema: c.id_sistema,
          cartera_manual_id: c.cartera_manual_id,
          cliente_nombre: clientLabel(c, manuals),
          titulo: 'Expediente abierto',
          detalle: c.proxima_accion,
          resultado: c.estado,
          usuario_nombre: null,
        }));
    }

    if (categoria === 'saltos') {
      const skipDay = skips.filter((s) => ecuadorYmd(s.created_at) === day);
      return skipDay.map((s) => {
        const c = caseById.get(s.case_id);
        return {
          occurred_at: s.created_at,
          case_id: s.case_id,
          id_sistema: c?.id_sistema ?? null,
          cartera_manual_id: c?.cartera_manual_id ?? null,
          cliente_nombre: c ? clientLabel(c, manuals) : 'Expediente',
          titulo: `Saltó ${this.tipoLabel(s.step_saltado)} → ${this.tipoLabel(s.step_ejecutado)}`,
          detalle: s.detalle_texto || s.motivo.replace(/_/g, ' '),
          resultado: s.motivo,
          usuario_nombre: people.get(s.usuario_id) || null,
        };
      });
    }

    return todayEv
      .filter((e) => e.tipo === categoria)
      .map((e) => toEventRow(e));
  },
};
