/**
 * Catálogos de gestión legal por pestaña.
 * Formal: 5 pasos con bifurcación en el paso 4 según poder especial (no confundir
 * con estado_vehiculo "poder_cliente" = vehículo en posesión del cliente).
 */

export type LegalPipeline = "operativa" | "formal";

export type PoderEspecialStatus = "vigente" | "vencido" | "no_existe";

export type GestionTipoOption = {
  value: string;
  label: string;
  /** Paso lógico 1–5 (formal). */
  step?: number;
  route?: "A" | "B";
  /** Hint de evidencia esperada. */
  evidenciaHint?: string;
};

/** Temprana / Media (Laura) */
export const OPERATIVA_TIPOS: GestionTipoOption[] = [
  { value: "llamada", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visita_cortesia", label: "Visita de cortesía" },
  { value: "acuerdo_pago", label: "Acuerdo de pago" },
  { value: "recordatorio", label: "Recordatorio" },
];

export const OPERATIVA_RESULTADOS: string[] = [
  "Contestó / prometió pagar",
  "No contesta",
  "Número equivocado",
  "Pagó",
  "Se negó a pagar",
];

/**
 * Formal (Johana) — secuencia real:
 * 1 Verificación → 2 Visita → 3 Predemanda → 4A/4B bifurcación → 5 Cierre
 */
export const FORMAL_TIPOS: GestionTipoOption[] = [
  {
    value: "verificacion",
    label: "1. Verificación (documentos + garantía)",
    step: 1,
    evidenciaHint: "Contrato, poder, estado de cuenta…",
  },
  {
    value: "visita_domiciliaria",
    label: "2. Visita domiciliaria",
    step: 2,
    evidenciaHint: "Foto / acta de visita",
  },
  {
    value: "predemanda",
    label: "3. Requerimiento formal (predemanda)",
    step: 3,
    evidenciaHint: "Constancia de envío / carta",
  },
  {
    value: "recuperacion_administrativa",
    label: "4A. Recuperación administrativa (con poder)",
    step: 4,
    route: "A",
    evidenciaHint: "Acta de entrega / retiro del vehículo",
  },
  {
    value: "via_judicial",
    label: "4B. Vía judicial (sin poder / resistencia)",
    step: 4,
    route: "B",
    evidenciaHint: "Número de proceso judicial + demanda",
  },
  {
    value: "cierre",
    label: "5. Cierre",
    step: 5,
    evidenciaHint: "Evidencia del resultado final",
  },
];

/** Tipos del pipeline Formal (3+ meses). */
export const FORMAL_TIPO_VALUES = new Set(FORMAL_TIPOS.map((t) => t.value));

/**
 * ¿Este evento es de cobranza operativa (Laura) o del pipeline formal (Johana)?
 * Formal: solo tipos del catálogo formal.
 * Operativa: todo lo demás (mensaje, whatsapp, nota, recordatorio, sistema, etc.).
 */
export function eventBelongsToPipeline(
  tipo: string | null | undefined,
  pipeline: LegalPipeline,
): boolean {
  const t = (tipo || "").toLowerCase().trim();
  const isFormalTipo = FORMAL_TIPO_VALUES.has(t);
  if (pipeline === "formal") return isFormalTipo;
  return !isFormalTipo;
}

export const FORMAL_RESULTADOS_BY_TIPO: Record<string, string[]> = {
  verificacion: [
    "Completa",
    "Incompleta (falta X)",
    "Cliente no entrega",
  ],
  visita_domiciliaria: [
    "Acuerdo de pago",
    "Promesa de pago",
    "No ubicado",
    "Se niega a pagar",
  ],
  predemanda: [
    "Enviado sin respuesta",
    "Respondió con acuerdo",
    "Respondió sin acuerdo",
  ],
  recuperacion_administrativa: [
    "Vehículo retirado (acta)",
    "Cliente entregó voluntario",
    "No se pudo ejecutar el poder",
  ],
  via_judicial: [
    "Proceso iniciado",
    "Vehículo recuperado (orden judicial)",
    "Cliente pagó",
    "Cartera castigada",
  ],
  cierre: [
    "Pago total",
    "Vehículo recuperado",
    "Acuerdo firmado",
    "Cartera castigada",
  ],
};

export const CIERRE_RESULTADO_CASTIGADO = "Cartera castigada";

export const PODER_ESPECIAL_OPTIONS: {
  value: PoderEspecialStatus;
  label: string;
}[] = [
  { value: "vigente", label: "Poder especial vigente" },
  { value: "vencido", label: "Poder especial vencido" },
  { value: "no_existe", label: "Sin poder especial" },
];

export const PODER_MARKER = "poder_especial=";
const META_TAG_RE = /\[[a-z_]+=[^\]]*\]\s*/gi;

export function stripMetaTags(detalle: string): string {
  return detalle.replace(META_TAG_RE, "").trim();
}

export function encodeMetaTag(key: string, value: string): string {
  const safe = value.replace(/[\[\]]/g, "").trim();
  return `[${key}=${safe}]`;
}

const META_LABELS: Record<string, string> = {
  contrato_completo: "Contrato",
  kardex_revisado: "Kardex",
  codeudor: "Codeudor",
  poder_especial: "Poder",
  fecha_envio: "Envío",
  numero_proceso: "Nº proceso",
  juzgado: "Juzgado",
  fecha_ingreso: "Ingreso demanda",
};

const META_VALUE_LABELS: Record<string, string> = {
  si: "Sí",
  no: "No",
  vigente: "Vigente",
  vencido: "Vencido",
  no_existe: "No existe",
};

export type DetalleMetaChip = {
  key: string;
  label: string;
  value: string;
  valueLabel: string;
  tone: "ok" | "warn" | "bad" | "neutral";
};

export function parseDetalleMeta(
  detalle: string | null | undefined,
): { chips: DetalleMetaChip[]; texto: string } {
  if (!detalle) return { chips: [], texto: "" };
  const chips: DetalleMetaChip[] = [];
  const re = /\[([a-z_]+)=([^\]]*)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(detalle)) !== null) {
    const key = m[1];
    const value = m[2].trim();
    const label = META_LABELS[key] || key.replace(/_/g, " ");
    const valueLabel = META_VALUE_LABELS[value] || value;
    let tone: DetalleMetaChip["tone"] = "neutral";
    if (value === "si" || value === "vigente") tone = "ok";
    else if (value === "vencido") tone = "warn";
    else if (value === "no" || value === "no_existe") tone = "bad";
    chips.push({ key, label, value, valueLabel, tone });
  }
  return { chips, texto: stripMetaTags(detalle) };
}

export function encodePoderInDetalle(
  detalle: string,
  poder: PoderEspecialStatus | null,
): string {
  const base = stripMetaTags(detalle);
  if (!poder) return base;
  const tag = encodeMetaTag("poder_especial", poder);
  return base ? `${tag} ${base}` : tag;
}

export function parsePoderFromDetalle(
  detalle: string | null | undefined,
): PoderEspecialStatus | null {
  if (!detalle) return null;
  const m = detalle.match(/poder_especial=(vigente|vencido|no_existe)/);
  return (m?.[1] as PoderEspecialStatus) || null;
}

/** Empaqueta checklist + poder de verificación en detalle (auditable). */
export function encodeVerificacionDetalle(input: {
  detalle: string;
  contratoCompleto: boolean;
  kardexRevisado: boolean;
  codeudor: "si" | "no" | "";
  poder: PoderEspecialStatus | null;
}): string {
  const tags = [
    encodeMetaTag("contrato_completo", input.contratoCompleto ? "si" : "no"),
    encodeMetaTag("kardex_revisado", input.kardexRevisado ? "si" : "no"),
    input.codeudor
      ? encodeMetaTag("codeudor", input.codeudor)
      : null,
    input.poder ? encodeMetaTag("poder_especial", input.poder) : null,
  ].filter(Boolean) as string[];
  const base = stripMetaTags(input.detalle);
  return base ? `${tags.join(" ")} ${base}` : tags.join(" ");
}

export function encodePredemandaDetalle(input: {
  detalle: string;
  fechaEnvio: string;
}): string {
  const tags = input.fechaEnvio
    ? [encodeMetaTag("fecha_envio", input.fechaEnvio)]
    : [];
  const base = stripMetaTags(input.detalle);
  return [...tags, base].filter(Boolean).join(" ");
}

export function encodeViaJudicialDetalle(input: {
  detalle: string;
  numeroProceso: string;
  juzgado: string;
  fechaIngreso: string;
}): string {
  const tags = [
    input.numeroProceso
      ? encodeMetaTag("numero_proceso", input.numeroProceso)
      : null,
    input.juzgado ? encodeMetaTag("juzgado", input.juzgado) : null,
    input.fechaIngreso
      ? encodeMetaTag("fecha_ingreso", input.fechaIngreso)
      : null,
  ].filter(Boolean) as string[];
  const base = stripMetaTags(input.detalle);
  return [...tags, base].filter(Boolean).join(" ");
}

/** Infiera el último poder registrado en verificaciones (o cualquier evento con marker). */
export function inferPoderEspecialFromEvents(
  events: { tipo?: string | null; detalle?: string | null; fecha?: string }[],
): PoderEspecialStatus | null {
  const sorted = [...events].sort((a, b) => {
    const ta = a.fecha ? new Date(a.fecha).getTime() : 0;
    const tb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return tb - ta;
  });
  for (const e of sorted) {
    const p = parsePoderFromDetalle(e.detalle);
    if (p) return p;
  }
  return null;
}

export function getTiposForPipeline(pipeline: LegalPipeline): GestionTipoOption[] {
  return pipeline === "formal" ? FORMAL_TIPOS : OPERATIVA_TIPOS;
}

export function getResultadosForTipo(
  pipeline: LegalPipeline,
  tipo: string,
): string[] {
  if (pipeline === "operativa") return OPERATIVA_RESULTADOS;
  return FORMAL_RESULTADOS_BY_TIPO[tipo] ?? [];
}

/** Filtra tipos del paso 4 según poder (bloqueo duro 4A/4B). */
export function filterFormalTiposByPoder(
  poder: PoderEspecialStatus | null,
): GestionTipoOption[] {
  return FORMAL_TIPOS.filter((t) => {
    if (t.value === "recuperacion_administrativa") return poder === "vigente";
    if (t.value === "via_judicial")
      return poder === "vencido" || poder === "no_existe";
    return true;
  });
}

/** Labels legibles para estado_vehiculo (posesión del bien, NO el poder notarial). */
export const ESTADO_VEHICULO_LABELS: Record<string, string> = {
  poder_cliente: "En poder del cliente",
  retenido: "Retenido",
  abandonado: "Abandonado / desconocido",
  taller: "En taller",
  recuperado: "Recuperado",
};

export function labelEstadoVehiculo(value: string | null | undefined): string {
  if (!value) return "—";
  return ESTADO_VEHICULO_LABELS[value] || value.replace(/_/g, " ");
}

export function defaultCanalForTipo(
  pipeline: LegalPipeline,
  tipo: string,
): string {
  if (pipeline === "formal") {
    if (tipo === "visita_domiciliaria" || tipo === "recuperacion_administrativa")
      return "presencial";
    return "sistema";
  }
  if (tipo === "whatsapp") return "whatsapp";
  if (tipo === "visita_cortesia") return "presencial";
  if (tipo === "recordatorio") return "mensaje";
  return "telefono";
}

/** Canal solo se pregunta cuando el tipo no lo implica (acuerdo / recordatorio). */
export function operativaNeedsCanalSelect(tipo: string): boolean {
  return tipo === "acuerdo_pago" || tipo === "recordatorio";
}
