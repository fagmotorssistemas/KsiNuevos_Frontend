export {
  todayEcuadorDate,
  ecuadorYmd,
} from '@/lib/ecuador-datetime';

export const FORMAL_PROGRESS_TIPOS = [
  'verificacion',
  'visita_domiciliaria',
  'predemanda',
  'recuperacion_administrativa',
  'via_judicial',
  'cierre',
] as const;

export type FormalProgressTipo = (typeof FORMAL_PROGRESS_TIPOS)[number];

export type FormalProgressCategoryId =
  | FormalProgressTipo
  | 'agenda'
  | 'aperturas'
  | 'saltos';

export type FormalProgressCategoryRow = {
  categoria: FormalProgressCategoryId;
  label: string;
  cantidad: number;
  /** Denominador para % (agenda = vencidas; pasos = casos avanzados del día). */
  total: number;
};

export type FormalProgressTrendPoint = {
  fecha: string;
  cobertura: number;
  casos_avanzados: number;
  agenda_due: number;
  agenda_done: number;
};

export type FormalDailyProgressPayload = {
  fecha: string;
  casos_avanzados: number;
  agenda_due: number;
  agenda_done: number;
  cobertura: number;
  cierres: number;
  aperturas: number;
  saltos: number;
  expedientes_abiertos: number;
  categorias: FormalProgressCategoryRow[];
  tendencia: FormalProgressTrendPoint[];
};

export type FormalProgressEventRow = {
  occurred_at: string;
  case_id: string;
  id_sistema: number | null;
  cartera_manual_id: string | null;
  cliente_nombre: string;
  titulo: string;
  detalle: string | null;
  resultado: string | null;
  usuario_nombre: string | null;
  pendiente?: boolean;
};

/** Semana sábado → viernes que contiene `isoDate` (YYYY-MM-DD). */
export function weekSaturdayToFriday(isoDate: string): string[] {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 17));
  const dow = date.getUTCDay();
  const daysFromSat = (dow + 1) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromSat);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setUTCDate(date.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function ecuadorDayBounds(isoDate: string): { start: string; end: string } {
  const day = isoDate.slice(0, 10);
  const start = new Date(`${day}T00:00:00-05:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
