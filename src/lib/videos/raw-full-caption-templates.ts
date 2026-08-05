/**
 * Plantillas de caption alineadas al cronograma de pilares (Guiones V2).
 * Live no aplica. Placeholders se rellenan con inventario (o quedan genéricos).
 *
 * IDs actuales (upload): video_autos | video_educativo | video_entretenimiento | video_humanizar
 * IDs legacy (carpetas viejas): ficha_rapida, pov_gancho, duelo, creativo, financiamiento, detras_camaras
 */

export type RawFullCaptionFormato =
  | 'video_autos'
  | 'video_educativo'
  | 'video_entretenimiento'
  | 'video_humanizar'
  /** @deprecated legacy */
  | 'ficha_rapida'
  | 'pov_gancho'
  | 'duelo'
  | 'detras_camaras'
  | 'financiamiento'
  | 'creativo'

/** Opciones del modal de subida (solo pilares). */
export const RAW_FULL_CAPTION_FORMATOS: Array<{
  id: RawFullCaptionFormato
  label: string
  vehiclesRequired: 0 | 1 | 2
  vehiclesAllowed: 0 | 1 | 2
  hint: string
  dotClass: string
}> = [
  {
    id: 'video_autos',
    label: 'Video Autos / Pilar 1',
    vehiclesRequired: 1,
    vehiclesAllowed: 1,
    hint: 'Obligatorio: un vehículo del inventario',
    dotClass: 'bg-cyan-500',
  },
  {
    id: 'video_educativo',
    label: 'Video Educativo',
    vehiclesRequired: 0,
    vehiclesAllowed: 0,
    hint: 'Sin vehículo — tips, financiamiento, educación',
    dotClass: 'bg-orange-500',
  },
  {
    id: 'video_entretenimiento',
    label: 'Video Entretenimiento',
    vehiclesRequired: 0,
    vehiclesAllowed: 0,
    hint: 'Sin vehículo — ganchos, retos, contenido ligero',
    dotClass: 'bg-violet-500',
  },
  {
    id: 'video_humanizar',
    label: 'Video Humanizar Marca',
    vehiclesRequired: 0,
    vehiclesAllowed: 0,
    hint: 'Sin vehículo — detrás de cámaras, día a día',
    dotClass: 'bg-rose-500',
  },
]

const LEGACY_FORMATO_IDS: RawFullCaptionFormato[] = [
  'ficha_rapida',
  'pov_gancho',
  'duelo',
  'detras_camaras',
  'financiamiento',
  'creativo',
]

const ALL_FORMATO_META: Array<{
  id: RawFullCaptionFormato
  label: string
  vehiclesRequired: 0 | 1 | 2
  vehiclesAllowed: 0 | 1 | 2
  hint: string
}> = [
  ...RAW_FULL_CAPTION_FORMATOS,
  {
    id: 'ficha_rapida',
    label: 'Ficha Rápida',
    vehiclesRequired: 1,
    vehiclesAllowed: 1,
    hint: 'Legacy',
  },
  {
    id: 'pov_gancho',
    label: 'POV / Gancho',
    vehiclesRequired: 0,
    vehiclesAllowed: 1,
    hint: 'Legacy',
  },
  {
    id: 'duelo',
    label: 'Comparativa / Duelo',
    vehiclesRequired: 2,
    vehiclesAllowed: 2,
    hint: 'Legacy',
  },
  {
    id: 'detras_camaras',
    label: 'Detrás de Cámaras',
    vehiclesRequired: 0,
    vehiclesAllowed: 0,
    hint: 'Legacy',
  },
  {
    id: 'financiamiento',
    label: 'Financiamiento (5B)',
    vehiclesRequired: 0,
    vehiclesAllowed: 0,
    hint: 'Legacy',
  },
  {
    id: 'creativo',
    label: 'Creativo',
    vehiclesRequired: 1,
    vehiclesAllowed: 1,
    hint: 'Legacy',
  },
]

export function getRawFullFormatoMeta(formato: string | null | undefined) {
  if (!formato) return null
  return ALL_FORMATO_META.find((f) => f.id === formato) ?? null
}

export type CaptionVehicleBits = {
  marca: string
  modelo: string
  version: string
  anio: string
  tipo: string
  cc: string
  combustible: string
  km: string
  extras: string
  caracteristicas: string
}

const MAPS = 'https://maps.app.goo.gl/ukJnbKb5kXvtewXX8'
const WA = 'https://wa.me/593983335555'

function hashtag(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
}

function fillVehicleDefaults(v?: Partial<CaptionVehicleBits> | null): CaptionVehicleBits {
  return {
    marca: v?.marca?.trim() || '[MARCA]',
    modelo: v?.modelo?.trim() || '[MODELO]',
    version: v?.version?.trim() || '',
    anio: v?.anio?.trim() || '[AÑO]',
    tipo: v?.tipo?.trim() || 'vehículo',
    cc: v?.cc?.trim() || '[CC]',
    combustible: v?.combustible?.trim() || 'gasolina',
    km: v?.km?.trim() || '[km]',
    extras: v?.extras?.trim() || 'equipamiento completo',
    caracteristicas: v?.caracteristicas?.trim() || 'diseño, confort y rendimiento',
  }
}

function captionAutos(
  a: CaptionVehicleBits,
  marcaModeloAnio: string,
  versionPart: string
): string {
  return `¿Buscabas exactamente esto? 👀

El ${a.marca} ${a.modelo}${versionPart} es un ${a.tipo} del año ${a.anio} que combina diseño actual con versatilidad real. Su motor de ${a.cc} ofrece un rendimiento óptimo con combustible a ${a.combustible}, ideal para quienes buscan confiabilidad y buen desempeño. Con ${a.km} kilómetros y ${a.extras}, este modelo es perfecto para ciudad y carretera.

¿Te falta para comprarlo?
✅ 25% de entrada
✅ Crédito hasta 60 meses
✅ Recibimos tu vehículo usado como parte de pago

Comenta ${marcaModeloAnio} y te pasamos toda la información.

Disponible en KSINUEVOS – Cuenca, vehículos seminuevos seleccionados con criterio.
📍 Av. España 6-73 y Sevilla, Cuenca
📍 Av. Gil Ramírez y Sevilla, Cuenca
🗺️ ${MAPS}
📲 Agenda tu test drive: ${WA}

#${hashtag(a.marca)} #${hashtag(a.modelo)}${hashtag(a.anio)} #${hashtag(a.marca)}Ecuador #KSINUEVOS #VehiculosSeminuevos #AutosUsadosCuenca #CompraVentaAutos`
}

function captionEducativo(): string {
  return `¿Crees que no calificas para un crédito de auto? 🤔

En KsiNuevos evaluamos varias opciones de financiamiento según tu caso — ingresos formales, RUC, o capacidad de pago comprobable, lo revisamos gratis contigo.

✅ 25% de entrada
✅ Crédito hasta 60 meses
✅ Recibimos tu vehículo usado como parte de pago

Escríbenos "FINANCIAMIENTO" y evaluamos tu caso sin costo.
📲 ${WA}

📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla | 🗺️ ${MAPS}

#KSINUEVOS #Financiamiento #CreditoAuto #AutosUsadosCuenca #VideoEducativo`
}

function captionEntretenimiento(): string {
  return `Lo que casi nadie revisa antes de comprar un seminuevo 👀

En KsiNuevos verificamos estado real, papeles al día y garantía legal antes de ofrecerte cualquier auto — así evitamos que te pase lo que le pasa a la mayoría.

✅ 25% de entrada
✅ Crédito hasta 60 meses
✅ Recibimos tu vehículo usado como parte de pago

Comenta GANCHO y te mandamos toda la información.

Disponible en KSINUEVOS – Cuenca.
📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla
🗺️ ${MAPS} | 📲 ${WA}

#KSINUEVOS #VehiculosSeminuevos #AutosUsadosCuenca #Entretenimiento`
}

function captionHumanizar(): string {
  return `Así es el día a día en KsiNuevos 🚙

Un vistazo real a lo que pasa antes de que un seminuevo llegue a tus manos: inspección, papeles al día, y todo el cuidado que ponemos en cada unidad.

Porque comprar un auto usado no debería ser un riesgo — por eso en KsiNuevos revisamos todo antes de ofrecerte cualquier vehículo.

👀 Síguenos para más contenido real del concesionario
📲 Agenda tu visita: ${WA}

📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla
🗺️ ${MAPS}

#KSINUEVOS #VehiculosSeminuevos #AutosUsadosCuenca #HumanizarMarca`
}

export function buildRawFullCaption(opts: {
  formato: RawFullCaptionFormato
  vehicle?: Partial<CaptionVehicleBits> | null
  vehicle2?: Partial<CaptionVehicleBits> | null
}): string {
  const a = fillVehicleDefaults(opts.vehicle)
  const b = fillVehicleDefaults(opts.vehicle2)
  const marcaModeloAnio = `${a.marca} ${a.modelo} ${a.anio}`.replace(/\s+/g, ' ').trim()
  const versionPart = a.version ? ` ${a.version}` : ''

  switch (opts.formato) {
    case 'video_autos':
    case 'ficha_rapida':
    case 'creativo':
      return captionAutos(a, marcaModeloAnio, versionPart)

    case 'video_educativo':
    case 'financiamiento':
      return captionEducativo()

    case 'video_entretenimiento':
    case 'pov_gancho':
      return opts.vehicle?.marca
        ? `Lo que casi nadie revisa antes de comprar un seminuevo 👀

En KsiNuevos verificamos estado real, papeles al día y garantía legal antes de ofrecerte cualquier auto — así evitamos que te pase lo que le pasa a la mayoría.

Este ${a.marca} ${a.modelo} cuenta con ${a.km} km, motor ${a.cc}, y ${a.caracteristicas} — revisado a fondo por nuestro equipo.

✅ 25% de entrada
✅ Crédito hasta 60 meses
✅ Recibimos tu vehículo usado como parte de pago

Comenta ${a.modelo} y te mandamos toda la información.

Disponible en KSINUEVOS – Cuenca.
📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla
🗺️ ${MAPS} | 📲 ${WA}

#${hashtag(a.marca)} #${hashtag(a.modelo)} #KSINUEVOS #VehiculosSeminuevos #AutosUsadosCuenca`
        : captionEntretenimiento()

    case 'video_humanizar':
    case 'detras_camaras':
      return captionHumanizar()

    case 'duelo':
      return `¿Cuál te llevarías tú? 👇

Dos seminuevos, presupuesto parecido — el ${a.modelo} y el ${b.modelo}, cada uno pensado para algo distinto.

${a.modelo}: ${a.caracteristicas}
${b.modelo}: ${b.caracteristicas}

Los dos disponibles en KsiNuevos con:
✅ 25% de entrada
✅ Crédito hasta 60 meses
✅ Recibimos tu vehículo usado como parte de pago

Vota 1 o 2 en comentarios y te decimos cuál te conviene según tu caso.

📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla | 🗺️ ${MAPS}
📲 ${WA}

#ksinuevos #vehiculosseminuevos #autosusadoscuenca #compraventaautos`
  }
}

export function isRawFullCaptionFormato(x: string): x is RawFullCaptionFormato {
  return (
    RAW_FULL_CAPTION_FORMATOS.some((f) => f.id === x) || LEGACY_FORMATO_IDS.includes(x as RawFullCaptionFormato)
  )
}

/** Pestañas de biblioteca alineadas al legend FORMATO / pilares. */
export type RawFullPilarTabId = 'pilar1' | 'pilar2' | 'pilar3' | 'pilar4'

export const RAW_FULL_PILAR_TABS: Array<{
  id: RawFullPilarTabId
  label: string
  shortLabel: string
  formatos: RawFullCaptionFormato[]
  dotClass: string
  activeClass: string
}> = [
  {
    id: 'pilar1',
    label: 'Video Autos / Pilar 1',
    shortLabel: 'Pilar 1',
    formatos: ['video_autos', 'ficha_rapida', 'pov_gancho', 'duelo', 'creativo'],
    dotClass: 'bg-cyan-500',
    activeClass: 'bg-white text-slate-900 shadow-sm ring-1 ring-cyan-200',
  },
  {
    id: 'pilar3',
    label: 'Video Educativo',
    shortLabel: 'Educativo',
    formatos: ['video_educativo', 'financiamiento'],
    dotClass: 'bg-orange-500',
    activeClass: 'bg-white text-slate-900 shadow-sm ring-1 ring-orange-200',
  },
  {
    id: 'pilar4',
    label: 'Video Entretenimiento',
    shortLabel: 'Entretenimiento',
    formatos: ['video_entretenimiento', 'pov_gancho'],
    dotClass: 'bg-violet-500',
    activeClass: 'bg-white text-slate-900 shadow-sm ring-1 ring-violet-200',
  },
  {
    id: 'pilar2',
    label: 'Video Humanizar Marca',
    shortLabel: 'Humanizar',
    formatos: ['video_humanizar', 'detras_camaras'],
    dotClass: 'bg-rose-500',
    activeClass: 'bg-white text-slate-900 shadow-sm ring-1 ring-rose-200',
  },
]

/**
 * Asigna una carpeta a la pestaña de formato.
 * Pilar 1 = cualquier video con vehículo (nombre del auto), aunque no tenga formato.
 */
export function rawFullFolderToPilarTab(folder: {
  formato: string | null | undefined
  inventoryVehicleId?: string | null
  inventory?: { id?: string } | null
}): RawFullPilarTabId | null {
  const hasVehicle = !!(folder.inventoryVehicleId?.trim() || folder.inventory?.id)
  const formato =
    folder.formato && isRawFullCaptionFormato(folder.formato) ? folder.formato : null

  if (formato === 'video_autos') return 'pilar1'
  if (formato === 'video_educativo' || formato === 'financiamiento') return 'pilar3'
  if (formato === 'video_entretenimiento') return 'pilar4'
  if (formato === 'video_humanizar' || formato === 'detras_camaras') return 'pilar2'

  if (hasVehicle) {
    if (formato === 'pov_gancho') return 'pilar1'
    return 'pilar1'
  }

  if (formato === 'pov_gancho') return 'pilar4'
  return null
}

export function rawFullFormatoToPilarTab(
  formato: string | null | undefined
): RawFullPilarTabId | null {
  return rawFullFolderToPilarTab({ formato, inventoryVehicleId: null })
}
