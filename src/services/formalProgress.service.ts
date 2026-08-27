import { createClient } from '@/lib/supabase/client';
import { walletService } from '@/services/wallet.service';
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
  manuals: Map<string, string>,
  oracle: Map<number, string>,
): string {
  if (row.cartera_manual_id) {
    return manuals.get(row.cartera_manual_id) || 'Cartera manual';
  }
  if (row.id_sistema != null) {
    return oracle.get(row.id_sistema) || `Cliente #${row.id_sistema}`;
  }
  return 'Expediente';
}

type OracleDebtorCache = {
  at: number;
  names: Map<number, string>;
  withSaldo: Set<number>;
  ready: boolean;
};

type OwingIndex = {
  oracleNames: Map<number, string>;
  oracleWithSaldo: Set<number>;
  oracleReady: boolean;
  manuals: Map<string, string>;
  manualsWithSaldo: Set<string>;
};

let oracleDebtorsCache: OracleDebtorCache | null = null;
const ORACLE_NAMES_TTL_MS = 5 * 60 * 1000;

async function loadOracleDebtors(): Promise<
  Pick<OracleDebtorCache, 'names' | 'withSaldo' | 'ready'>
> {
  const now = Date.now();
  if (oracleDebtorsCache && now - oracleDebtorsCache.at <= ORACLE_NAMES_TTL_MS) {
    return oracleDebtorsCache;
  }
  try {
    const debtors = await walletService.getAllDebtors(5000);
    const names = new Map<number, string>();
    const withSaldo = new Set<number>();
    for (const d of debtors ?? []) {
      const id = Number(d.clienteId);
      if (!Number.isFinite(id)) continue;
      if (d.nombre?.trim()) names.set(id, d.nombre.trim());
      if (Number(d.totalDeuda) > 0) withSaldo.add(id);
    }
    oracleDebtorsCache = { at: now, names, withSaldo, ready: true };
  } catch (e) {
    console.error('[formalProgress] oracle debtors:', e);
    if (!oracleDebtorsCache) {
      oracleDebtorsCache = {
        at: now,
        names: new Map(),
        withSaldo: new Set(),
        ready: false,
      };
    }
  }
  return oracleDebtorsCache;
}

async function fetchOwingIndex(
  supabase: ReturnType<typeof createClient>,
  cases: CaseLite[],
): Promise<OwingIndex> {
  const manuals = new Map<string, string>();
  const manualsWithSaldo = new Set<string>();
  const manualIds = [
    ...new Set(cases.map((c) => c.cartera_manual_id).filter(Boolean) as string[]),
  ];
  const oracle = await loadOracleDebtors();

  if (manualIds.length) {
    const { data } = await supabase
      .from('cartera_manual')
      .select('id, nombre_completo, saldo_actual')
      .in('id', manualIds);
    for (const row of data ?? []) {
      if (row.nombre_completo) manuals.set(row.id, row.nombre_completo);
      if (Number(row.saldo_actual) > 0) manualsWithSaldo.add(row.id);
    }
  }

  return {
    oracleNames: oracle.names,
    oracleWithSaldo: oracle.withSaldo,
    oracleReady: oracle.ready,
    manuals,
    manualsWithSaldo,
  };
}

function keepOwingCases(cases: CaseLite[], owing: OwingIndex): CaseLite[] {
  return cases.filter((c) => {
    if (c.cartera_manual_id) return owing.manualsWithSaldo.has(c.cartera_manual_id);
    if (c.id_sistema != null && Number.isFinite(c.id_sistema)) {
      if (!owing.oracleReady) return true;
      return owing.oracleWithSaldo.has(c.id_sistema);
    }
    return false;
  });
}

async function fetchOpenOwingUniverse(
  supabase: ReturnType<typeof createClient>,
): Promise<{ cases: CaseLite[]; owing: OwingIndex }> {
  const open = await fetchOpenCases(supabase);
  const owing = await fetchOwingIndex(supabase, open);
  return { cases: keepOwingCases(open, owing), owing };
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

async function fetchPeople(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const people = new Map<string, string>();
  const uniqueUsers = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUsers.length) return people;
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', uniqueUsers);
  for (const p of data ?? []) {
    if (p.full_name) people.set(p.id, p.full_name);
  }
  return people;
}

async function fetchLatestFormalByCase(
  supabase: ReturnType<typeof createClient>,
  caseIds: string[],
): Promise<Map<string, EventLite>> {
  const latest = new Map<string, EventLite>();
  if (caseIds.length === 0) return latest;
  const { data, error } = await supabase
    .from('case_events')
    .select('id, case_id, tipo, descripcion, resultado, detalle, fecha, usuario_id')
    .in('tipo', [...FORMAL_PROGRESS_TIPOS])
    .in('case_id', caseIds)
    .order('fecha', { ascending: false })
    .limit(5000);
  if (error) {
    console.error('[formalProgress] latest events:', error);
    return latest;
  }
  for (const row of data ?? []) {
    if (!latest.has(row.case_id)) latest.set(row.case_id, row as EventLite);
  }
  return latest;
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
  latestByCase: Map<string, EventLite>,
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
  const quedadosAgenda = [...due].filter((id) => !advanced.has(id)).length;
  let quedadosSinPaso = 0;
  let quedadosEnProceso = 0;
  for (const c of cases) {
    const last = latestByCase.get(c.id);
    if (!last) quedadosSinPaso += 1;
    else if (last.tipo !== 'cierre') quedadosEnProceso += 1;
  }

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
    quedados_agenda: quedadosAgenda,
    quedados_sin_paso: quedadosSinPaso,
    quedados_en_proceso: quedadosEnProceso,
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

    const [{ cases }, events, skips] = await Promise.all([
      fetchOpenOwingUniverse(supabase),
      fetchEventsInRange(supabase, rangeStart, rangeEnd),
      fetchSkipsInRange(supabase, rangeStart, rangeEnd),
    ]);
    const latestByCase = await fetchLatestFormalByCase(
      supabase,
      cases.map((c) => c.id),
    );

    return buildPayload(day, cases, events, skips, latestByCase);
  },

  async getCategoryEvents(
    fecha: string,
    categoria: FormalProgressCategoryId,
  ): Promise<FormalProgressEventRow[]> {
    const day = fecha.slice(0, 10);
    const { start, end } = ecuadorDayBounds(day);
    const supabase = createClient();

    const [{ cases, owing }, events, skips] = await Promise.all([
      fetchOpenOwingUniverse(supabase),
      fetchEventsInRange(supabase, start, end),
      categoria === 'saltos'
        ? fetchSkipsInRange(supabase, start, end)
        : Promise.resolve([] as SkipLite[]),
    ]);
    const latestByCase =
      categoria === 'quedados_sin_paso' ||
      categoria === 'quedados_en_proceso' ||
      categoria === 'quedados_agenda'
        ? await fetchLatestFormalByCase(
            supabase,
            cases.map((c) => c.id),
          )
        : new Map<string, EventLite>();

    const caseById = new Map(cases.map((c) => [c.id, c]));
    const todayEv = dayEvents(events, day).filter((e) => isFormalTipo(e.tipo));

    const extraIds: string[] = [];
    if (categoria === 'saltos') {
      for (const s of skips) extraIds.push(s.usuario_id, s.case_id);
    }
    for (const e of todayEv) {
      if (e.usuario_id) extraIds.push(e.usuario_id);
    }
    for (const last of latestByCase.values()) {
      if (last.usuario_id) extraIds.push(last.usuario_id);
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
    const extraManualIds = allCases
      .map((c) => c.cartera_manual_id)
      .filter((id): id is string => !!id && !owing.manuals.has(id));
    if (extraManualIds.length) {
      const extraOwing = await fetchOwingIndex(supabase, allCases);
      for (const [id, name] of extraOwing.manuals) owing.manuals.set(id, name);
      for (const id of extraOwing.manualsWithSaldo) owing.manualsWithSaldo.add(id);
    }
    const people = await fetchPeople(supabase, [
      ...todayEv.map((e) => e.usuario_id || ''),
      ...skips.map((s) => s.usuario_id),
      ...extraIds,
    ]);
    const manuals = owing.manuals;
    const oracle = owing.oracleNames;

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
        cliente_nombre: c ? clientLabel(c, manuals, oracle) : 'Expediente',
        titulo: titulo || this.tipoLabel(e.tipo || ''),
        detalle: e.detalle || e.descripcion,
        resultado: e.resultado,
        usuario_nombre: e.usuario_id ? people.get(e.usuario_id) || null : null,
        pendiente,
      };
    };

    if (categoria === 'quedados_agenda') {
      const due = agendaDueIds(cases, day);
      const advanced = new Set(todayEv.map((e) => e.case_id));
      return [...due]
        .filter((id) => !advanced.has(id))
        .flatMap((id) => {
          const c = caseById.get(id);
          if (!c) return [];
          const last = latestByCase.get(id);
          const row: FormalProgressEventRow = {
            occurred_at: last?.fecha || c.fecha_proxima_accion || day,
            case_id: c.id,
            id_sistema: c.id_sistema,
            cartera_manual_id: c.cartera_manual_id,
            cliente_nombre: clientLabel(c, manuals, oracle),
            titulo: c.proxima_accion || 'Acción programada',
            detalle: last
              ? `Último paso: ${this.tipoLabel(last.tipo || '')}`
              : 'Sin paso Formal todavía',
            resultado: last?.resultado ?? null,
            usuario_nombre: null,
            pendiente: true,
          };
          return [row];
        });
    }

    if (categoria === 'quedados_sin_paso') {
      return cases
        .filter((c) => !latestByCase.has(c.id))
        .map((c) => ({
          occurred_at: c.fecha_proxima_accion || c.created_at || day,
          case_id: c.id,
          id_sistema: c.id_sistema,
          cartera_manual_id: c.cartera_manual_id,
          cliente_nombre: clientLabel(c, manuals, oracle),
          titulo: 'Sin arrancar Formal',
          detalle: c.proxima_accion || 'No hay verificación ni ningún paso del pipeline',
          resultado: c.estado,
          usuario_nombre: null,
          pendiente: true,
        }));
    }

    if (categoria === 'quedados_en_proceso') {
      return cases
        .filter((c) => {
          const last = latestByCase.get(c.id);
          return !!last && last.tipo !== 'cierre';
        })
        .map((c) => {
          const last = latestByCase.get(c.id);
          return {
            occurred_at: last?.fecha || c.fecha_proxima_accion || day,
            case_id: c.id,
            id_sistema: c.id_sistema,
            cartera_manual_id: c.cartera_manual_id,
            cliente_nombre: clientLabel(c, manuals, oracle),
            titulo: last ? `Quedó en ${this.tipoLabel(last.tipo || '')}` : 'En proceso',
            detalle: c.proxima_accion || last?.descripcion || last?.detalle,
            resultado: last?.resultado ?? c.estado,
            usuario_nombre: last?.usuario_id ? people.get(last.usuario_id) || null : null,
            pendiente: true,
          };
        });
    }

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
            cliente_nombre: clientLabel(c, manuals, oracle),
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
          cliente_nombre: clientLabel(c, manuals, oracle),
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
          cliente_nombre: c ? clientLabel(c, manuals, oracle) : 'Expediente',
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
