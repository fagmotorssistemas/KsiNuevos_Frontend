export const ETAPAS = [
  { etapa: 0, label: 'Entró' },
  { etapa: 1, label: 'Respondió' },
  { etapa: 2, label: 'Conversó' },
  { etapa: 3, label: 'Precio' },
  { etapa: 4, label: 'Cuota' },
  { etapa: 5, label: 'Agendó' },
  { etapa: 6, label: 'Visitó' },
  { etapa: 7, label: 'Vendió' },
] as const

export const OBJECION_LABELS: Record<string, string> = {
  precio: 'Precio',
  entrada: 'Entrada',
  rechaza_credito: 'Rechaza crédito',
  retoma: 'Retoma',
  modelo: 'Modelo',
  equipamiento: 'Equipamiento',
  km: 'Kilometraje',
  solo_cotiza: 'Solo cotiza',
  ubicacion: 'Ubicación',
  ya_compro: 'Ya compró',
  sin_conversacion: 'Sin conversación',
  no_responde: 'No responde',
  sin_cierre: 'Sin cierre',
  numero_equivocado: 'Número equivocado',
  fuera_territorio: 'Fuera de territorio',
  otro: 'Otro',
}

export const TICKET_LABELS: Record<string, string> = {
  high: 'High',
  medio: 'Medio',
  low: 'Low',
}

export const SEGUIMIENTO_LABELS: Record<string, string> = {
  activo: 'Activo',
  aplazado: 'Aplazado',
  cerrado: 'Cerrado',
}

export const CANCELACION_LABELS: Record<string, string> = {
  respondio_retoma: 'Respondió una retoma anterior',
  cliente_escribio: 'El cliente escribió',
  kommo_campo_seguimiento: 'Seguimiento marcado en Kommo',
  bot_stopped: 'Bot apagado',
  sin_lead_kommo: 'Sin lead en Kommo',
  etapa_visita: 'Ya agendó visita',
  stop: 'Stop',
  objecion_fuera_territorio: 'Fuera de territorio',
  kommo_respuesta_ia: 'Respuesta IA en Kommo',
}

export const POST_FOTO_PASOS: Record<number, string> = {
  1: '40 min',
  2: '3 h',
  3: '6 h',
}

export const SENAL_LABELS: Record<string, string> = {
  interes_financiamiento: 'Interés en crédito',
  financiamiento_detallado: 'Pidió detalle del crédito',
  entrada_concreta: 'Habló de la entrada',
  presupuesto_mencionado: 'Dijo un presupuesto',
  interes_retoma: 'Quiere dar su carro',
  comparacion_activa: 'Compara con otros',
  visita_con_fecha: 'Dio fecha de visita',
  confirma_visita: 'Confirmó la visita',
  urgencia_compra: 'Urgencia de compra',
  baja_intencion: 'Baja intención',
  cambio_temperatura: 'Cambio de temperatura',
}

export const SENALES_NEGATIVAS = new Set(['baja_intencion'])

export const SENAL_ORIGEN_LABELS: Record<string, string> = {
  bot: 'Bot',
  asesor: 'Asesor',
  externo: 'Externo',
}

export const TEMPERATURA_LABELS: Record<string, string> = {
  frio: 'Frío',
  tibio: 'Tibio',
  caliente: 'Caliente',
}

export const TEMPERATURA_RANK: Record<string, number> = {
  frio: 0,
  tibio: 1,
  caliente: 2,
}

export function labelOf(map: Record<string, string>, key: string | null | undefined, fallback = 'Sin dato'): string {
  if (!key) return fallback
  return map[key] ?? key.replaceAll('_', ' ')
}
