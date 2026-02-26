/**
 * Resultado del análisis de imágenes del vehículo (ej. vía Vision API en n8n).
 * Se guarda en scraper_vehicles.image_analysis (JSONB) cuando exista la columna.
 */

/** Una o doble cabina (pickups). */
export type CabinaType = "una_cabina" | "doble_cabina" | "no_aplica" | null;

/** Tipo de vendedor inferido por el contexto de las fotos. */
export type TipoVendedor = "concesionaria" | "particular" | "indeterminado" | null;

/** Hallazgos de exterior. */
export interface ExteriorAnalysis {
  /** Golpes, abolladuras o rayones visibles. */
  golpes_abolladuras_raspones: boolean | null;
  /** Diferencias de tono entre paneles (posible repintado o choque). */
  diferencias_tono_paneles: boolean | null;
  /** Desalineación de puertas/capó/maletero (posible choque estructural). */
  desalineacion_puertas_capot_maletero: boolean | null;
  /** Oxidación visible (bordes, guardafangos, chasis si se ve). */
  oxidacion_visible: boolean | null;
  /** Estado de faros: opacos o rotos. */
  faros_opacos_o_rotos: boolean | null;
  /** Llantas: desgaste irregular (alineación/suspensión). */
  llantas_desgaste_irregular: boolean | null;
  /** Nivel de vida útil de llantas: descripción breve (ej. "bueno", "regular", "cambio recomendado"). */
  llantas_vida_util: string | null;
  /** Notas libres de exterior. */
  notas: string | null;
}

/** Hallazgos de interior. */
export interface InteriorAnalysis {
  /** Desgaste de volante, palanca, pedales (consistencia con kilometraje declarado). */
  desgaste_volante_palanca_pedales: string | null;
  /** Asientos rotos o muy gastados. */
  asientos_rotos_o_gastados: boolean | null;
  /** Señales de humedad/inundación: manchas, moho, alfombra levantada, óxido en rieles. */
  senales_humedad_inundacion: boolean | null;
  /** Luces de warning en tablero visibles (si hay foto del tablero). */
  luces_warning_tablero: string[] | null;
  /** Notas libres de interior. */
  notas: string | null;
}

export interface VehicleImageAnalysis {
  /** Una o doble cabina (para pickups). */
  cabina: CabinaType;
  /** Si la marca visible en el vehículo/emblemas coincide con la extraída del título. */
  marca_coincide_con_titulo: boolean | null;
  /** Análisis de exterior (carrocería, faros, llantas). */
  exterior: ExteriorAnalysis | null;
  /** Análisis de interior (solo si hubo fotos de interior/tablero). */
  interior: InteriorAnalysis | null;
  /** Placa/matrícula legible (para verificación en algunos países). */
  placa_matricula: string | null;
  /** Si el contexto sugiere concesionaria (varios autos, lugar amplio, marca de agua). */
  tipo_vendedor: TipoVendedor;
  /** Resumen en texto libre por si se quiere mostrar en UI. */
  resumen: string | null;
  /** Fecha/hora del análisis (ISO). */
  analyzed_at: string | null;
}
