/**
 * Plantillas de caption alineadas a los formatos de Guiones V2 / cronograma.
 * Live no aplica. Placeholders se rellenan con inventario (o quedan genéricos).
 */

export type RawFullCaptionFormato =
  | 'ficha_rapida'
  | 'pov_gancho'
  | 'duelo'
  | 'detras_camaras'
  | 'financiamiento'
  | 'creativo'

export const RAW_FULL_CAPTION_FORMATOS: Array<{
  id: RawFullCaptionFormato
  label: string
  /** Mínimo de vehículos obligatorios (0 = no obligatorio). */
  vehiclesRequired: 0 | 1 | 2
  /** Cuántos selectores mostrar (puede ser > required, p. ej. gancho opcional). */
  vehiclesAllowed: 0 | 1 | 2
  hint: string
}> = [
  {
    id: 'ficha_rapida',
    label: 'Ficha Rápida',
    vehiclesRequired: 1,
    vehiclesAllowed: 1,
    hint: 'Obligatorio: un vehículo del inventario',
  },
  {
    id: 'pov_gancho',
    label: 'POV / Gancho',
    vehiclesRequired: 0,
    vehiclesAllowed: 1,
    hint: 'Vehículo opcional — puedes guardar solo con el copy',
  },
  {
    id: 'duelo',
    label: 'Comparativa / Duelo',
    vehiclesRequired: 2,
    vehiclesAllowed: 2,
    hint: 'Obligatorio: dos vehículos distintos para comparar',
  },
  {
    id: 'detras_camaras',
    label: 'Detrás de Cámaras',
    vehiclesRequired: 0,
    vehiclesAllowed: 0,
    hint: 'Sin vehículo — contenido del concesionario',
  },
  {
    id: 'financiamiento',
    label: 'Financiamiento (5B)',
    vehiclesRequired: 0,
    vehiclesAllowed: 0,
    hint: 'Sin vehículo — solo hablamos de financiamiento',
  },
  {
    id: 'creativo',
    label: 'Creativo',
    vehiclesRequired: 1,
    vehiclesAllowed: 1,
    hint: 'Obligatorio: un vehículo del inventario',
  },
]

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
    case 'ficha_rapida':
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

    case 'pov_gancho':
      return `Lo que casi nadie revisa antes de comprar un seminuevo 👀

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

    case 'detras_camaras':
      return `Así es el día a día en KsiNuevos 🚙

Un vistazo real a lo que pasa antes de que un seminuevo llegue a tus manos: inspección, papeles al día, y todo el cuidado que ponemos en cada unidad.

Porque comprar un auto usado no debería ser un riesgo — por eso en KsiNuevos revisamos todo antes de ofrecerte cualquier vehículo.

👀 Síguenos para más contenido real del concesionario
📲 Agenda tu visita: ${WA}

📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla
🗺️ ${MAPS}

#KSINUEVOS #VehiculosSeminuevos #AutosUsadosCuenca #DetrasDeCamaras`

    case 'financiamiento':
      return `¿Crees que no calificas para un crédito de auto? 🤔

En KsiNuevos evaluamos varias opciones de financiamiento según tu caso — ingresos formales, RUC, o capacidad de pago comprobable, lo revisamos gratis contigo.

✅ 25% de entrada
✅ Crédito hasta 60 meses
✅ Recibimos tu vehículo usado como parte de pago

Escríbenos "FINANCIAMIENTO" y evaluamos tu caso sin costo.
📲 ${WA}

📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla | 🗺️ ${MAPS}

#KSINUEVOS #Financiamiento #CreditoAuto #AutosUsadosCuenca`

    case 'creativo':
      return `¿Buscabas exactamente esto? 👀

El ${a.marca} ${a.modelo}${versionPart} ${a.anio} destaca por ${a.caracteristicas}. Motor ${a.cc}, ${a.km} km, pensado para quienes buscan un seminuevo confiable en Cuenca.

✅ 25% de entrada
✅ Crédito hasta 60 meses
✅ Recibimos tu vehículo usado como parte de pago

Comenta ${marcaModeloAnio} y te pasamos toda la información.
🗺️ ${MAPS}
📲 Agenda tu test drive ahora mismo 👉 ${WA}

📍 Av. España 6-73 y Sevilla | 📍 Av. Gil Ramírez y Sevilla

#${hashtag(a.marca)} #${hashtag(a.modelo)} #KSINUEVOS #VehiculosSeminuevos #AutosUsadosCuenca #Creativo`
  }
}

export function isRawFullCaptionFormato(x: string): x is RawFullCaptionFormato {
  return RAW_FULL_CAPTION_FORMATOS.some((f) => f.id === x)
}
