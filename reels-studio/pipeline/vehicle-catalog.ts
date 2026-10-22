/**
 * Qué es cada vehículo de verdad, por marca y modelo, sin depender de la carrocería del inventario (que viene
 * mezclada: "jeep", "blindado", "particular", "station wagon", "hibrido-j", vacía…). Una Hilux blindada es una
 * camioneta; una Trailblazer o una Expedition blindadas son SUV; una CX-30 híbrida es SUV.
 *
 * Es la primera respuesta del sistema; Claude la confirma mirando los clips y escuchando al asesor (ver el
 * director). Cubre los modelos del inventario de K-SI y los más comunes en Ecuador; un modelo que no está aquí lo
 * resuelve Claude con lo que sabe y lo que ve.
 */

import { VEHICLE_TIERS, VEHICLE_TYPES } from '../src/plan/schema'

export { VEHICLE_TIERS, VEHICLE_TYPES }
export type VehicleType = (typeof VEHICLE_TYPES)[number]
export type VehicleTier = (typeof VEHICLE_TIERS)[number]

/** Nombres de marca corregidos (el inventario trae "Mercedez Benz", "Porshe", "Susuki"…). */
const BRAND_FIXES: Array<[RegExp, string]> = [
  [/^merced[eé]?[sz]?[\s-]*benz$|^mercedes$/i, 'Mercedes-Benz'],
  [/^pors?c?he$/i, 'Porsche'],
  [/^su[sz]uki$/i, 'Suzuki'],
  [/^land[\s-]?rover$/i, 'Land Rover'],
  [/^great[\s-]?wall$/i, 'Great Wall'],
  [/^am general( corp\.?)?$/i, 'AM General'],
  [/^zx( auto)?$/i, 'ZX Auto'],
  [/^volks?wagen$|^vw$/i, 'Volkswagen'],
  [/^citro[eë]n$/i, 'Citroën'],
  [/^hyundai$/i, 'Hyundai'],
  [/^(bmw|byd|jac|faw|dfsk|ram|mg|gac|baic|jmc|kgm)$/i, ''], // siglas: van en mayúsculas
  [/^mini$/i, 'MINI'],
]

export function normalizeBrand(raw: string | undefined | null): string {
  const s = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!s) return ''
  for (const [re, fixed] of BRAND_FIXES) if (re.test(s)) return fixed || s.toUpperCase()
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Marcas premium y súper premium (la gama puede subir por modelo, ver MODEL_TIER). */
const SUPER_PREMIUM_BRANDS = /^(porsche|land rover|range rover|maserati|bentley|ferrari|lamborghini|aston martin|rolls[\s-]?royce|mclaren)$/i
const PREMIUM_BRANDS = /^(mercedes-benz|bmw|audi|mini|volvo|lexus|infiniti|acura|cadillac|lincoln|genesis|alfa romeo|jaguar|ds|lynk & co)$/i
/** Modelos que suben a súper premium dentro de una marca premium. */
const SUPER_PREMIUM_MODELS = /\b(amg(?! ?line)|g[\s-]?class|clase g|g ?63|g ?500|s[\s-]?class|clase s|maybach|gle|gls|x5|x6|x7|m[2-8]\b|q7|q8|rs ?\d|r8|e-?tron gt|lx ?\d*|ls ?\d*)\b/i

/** Familias de modelo → tipo (lo más específico primero: "corolla cross" antes que "corolla"). */
const MODEL_TYPES: Array<[RegExp, VehicleType]> = [
  // Camionetas (pickups y de trabajo)
  [/\b(sport ?trac|pick ?up|hilux|ranger|l ?200|triton|d[\s-]?max|luv|colorado|s ?10|montana|f[\s-]?1[05]0|f[\s-]?250|raptor|ram|amarok|frontier|navara|np ?300|bt[\s-]?50|b ?2[26]00|wingle|poer|cannon|tunland|rich|hunter|shark|terralord|t60|t90|t6|t8|hfc ?1037|tacoma|tundra|silverado|cheyenne|saveiro|strada|toro|oroch|alaskan|maverick|gladiator|kavak|dyna|canter|hfc ?10[4-9]\d|nkr|npr)\b/i, 'camioneta'],
  // SUV (también los que el inventario marca "jeep", "station wagon", "blindado" o "híbrido")
  [/\b(corolla ?cross|yaris ?cross|grand ?vitara|vitara|jimny|s[\s-]?cross|grand ?cherokee|cherokee|wrangler|compass|renegade|land ?cruiser|prado|4 ?runner|fortuner|rav ?4|rush|highlander|trailblazer|tahoe|suburban|blazer|equinox|captiva|tracker|groove|traverse|expedition|explorer|escape|ecosport|bronco|edge|territory|kuga|cs ?\d{2}|uni[\s-]?[tkv]|tiggo|haval|h ?6|jolion|dargo|creta|tucson|santa ?fe|kona|venue|palisade|ix ?35|sportage|seltos|sorento|stonic|sonet|niro|cr[\s-]?v|hr[\s-]?v|wr[\s-]?v|pilot|passport|cx[\s-]?3|cx[\s-]?30|cx[\s-]?5|cx[\s-]?50|cx[\s-]?60|cx[\s-]?9|cx[\s-]?90|montero|outlander|asx|eclipse ?cross|kicks|qashqai|x[\s-]?trail|pathfinder|murano|duster|koleos|captur|t[\s-]?cross|tiguan|taos|touareg|x ?[5-9]0|dashing|traveller|t1|t2|yuan|song|tang|atto ?3|glory|ix ?5|sx ?5|ax ?7|dx ?3|dx ?5|dx ?7|swm|g01|s[2-7]|js[2-8]|v3|bestune|t77|cj ?[5-8]|cayenne|macan|q[2-8]|x[1-7]|gl[abce]|glc|xc ?[46]0|countryman|aircross)\b/i, 'suv'],
  // Deportivos (después de SUV: en "Sportage R GTI", GTI es el acabado, no un deportivo)
  [/\b(camaro|mustang|corvette|mx[\s-]?5|miata|mx[\s-]?3|rx[\s-]?[78]|gt ?86|gr ?86|brz|supra|370 ?z|350 ?z|gti|golf r|type ?r|civic si|veloster|stinger|911|cayman|boxster|z4|john cooper works|jcw)\b/i, 'deportivo'],
  // Vans y furgones
  [/\b(h[\s-]?1|staria|kombi|transporter|crafter|fiorino|ducato|hiace|urvan|nv ?350|sprinter|vito|carens|scenic|sunray|van|furg[oó]n)\b/i, 'van'],
  // Hatchbacks
  [/\b(picanto|swift|qq ?3?|polo|golf|c3|grand ?i ?10|i ?10|i ?20|matrix|onix|kwid|sandero|stepway|spark|aveo hb|yaris hb|fit|march|celerio|alto|baleno|up!?|gol|clio|208|a1|cooper|clubman|mazda ?2|beetle|escarabajo)\b/i, 'hatchback'],
  // Sedanes
  [/\b(corolla|yaris|camry|sentra|versa|tiida|almera|altima|sonata|elantra|accent|ioniq|cerato|k ?3|k ?5|rio|soluto|optra|aveo|cruze|malibu|alsvin|arrizo|logan|symbol|granada|fusion|focus|fiesta|mazda ?3|mazda ?6|jetta|passat|virtus|vento|a ?3|a ?4|a ?6|clase c|c ?[0-9]{3}|serie ?[1-5]|3 ?series|civic|city|accord|lancer|attrage|mirage)\b/i, 'sedan'],
]

/** Carrocería del inventario → tipo, solo cuando el modelo no dice nada (y nunca con "blindado", "híbrido", etc.). */
function typeFromBody(body: string): VehicleType | null {
  const t = body.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/cabina|camioneta|pick ?up|cajon/.test(t)) return 'camioneta'
  if (/jeep|suv|todoterreno|station/.test(t)) return 'suv'
  if (/cupe|coupe|convertible|deportiv/.test(t)) return 'deportivo'
  if (/hatch|hatck/.test(t)) return 'hatchback'
  if (/\bvan\b|furgon|minibus/.test(t)) return 'van'
  if (/sedan|automovil/.test(t)) return 'sedan'
  return null
}

export type VehicleClass = {
  marca: string
  /** Modelo con la errata corregida si la hay ("Couper" → "Cooper"). */
  modelo: string
  tipo: VehicleType | null
  gama: VehicleTier
  blindado: boolean
  hibrido: boolean
  /** De dónde salió el tipo: el modelo (confiable), la carrocería (dudosa) o nada (lo decide Claude). */
  fuente: 'modelo' | 'carroceria' | 'desconocido'
}

export function classifyVehicle(v: { marca?: string | null; modelo?: string | null; carroceria?: string | null }): VehicleClass {
  const marca = normalizeBrand(v.marca)
  const modelo = (v.modelo ?? '').trim().replace(/\bcouper\b/i, 'Cooper')
  const body = (v.carroceria ?? '').trim()
  const text = `${modelo} ${body}`.toLowerCase()
  const blindado = /blindad/.test(text)
  const hibrido = /h[ií]b(rid[oa])?\b|hibrido|hybrid|hev\b|phev/.test(text)

  let tipo: VehicleType | null = null
  let fuente: VehicleClass['fuente'] = 'desconocido'
  // Nombres que también son años o números comunes: solo cuentan con su marca.
  const byBrand: VehicleType | null = /peugeot/i.test(marca) && /\b[235]008/.test(modelo)
    ? 'suv'
    : /fiat/i.test(marca) && /\b500\b/.test(modelo)
      ? 'hatchback'
      : null
  if (byBrand) {
    tipo = byBrand
    fuente = 'modelo'
  }
  for (const [re, t] of tipo ? [] : MODEL_TYPES) {
    if (re.test(modelo)) {
      tipo = t
      fuente = 'modelo'
      break
    }
  }
  if (!tipo) {
    const fromBody = body ? typeFromBody(body) : null
    if (fromBody) {
      tipo = fromBody
      fuente = 'carroceria'
    }
  }

  let gama: VehicleTier = 'normal'
  if (SUPER_PREMIUM_BRANDS.test(marca)) gama = 'super_premium'
  else if (PREMIUM_BRANDS.test(marca)) gama = SUPER_PREMIUM_MODELS.test(modelo) ? 'super_premium' : 'premium'
  return { marca, modelo, tipo, gama, blindado, hibrido, fuente }
}

/** Resumen para Claude: cómo se clasifican los vehículos de K-SI (lo que hace este catálogo, en palabras). */
export const CATALOG_GUIDE = `CÓMO SE CLASIFICAN LOS VEHÍCULOS DE K-SI (por lo que el auto ES, nunca por la carrocería escrita en el inventario)
- La carrocería del inventario viene mezclada y no se usa para decidir: "jeep", "blindado", "particular", "station wagon",
  "hibrido-j", "hibrido-a", "gas" o vacía no dicen qué auto es.
- Ser blindado o híbrido es una característica (se destaca en el Reel si se dice o se ve); el tipo es el del modelo.
  Hilux, F-150, D-Max blindadas → camioneta. Trailblazer, Expedition blindadas → SUV.
  CX-30, Kona, Corolla Cross híbridos → SUV. Corolla híbrido → sedán.
- camioneta = pickups y de trabajo: Hilux, Ranger, L200, D-Max, LUV, Colorado, Montana, F-150, RAM, Amarok, Frontier,
  BT-50, B2600, Wingle, Poer, Tunland, Dongfeng Rich, Changan Hunter, BYD Shark, ZX Terralord, JAC T6/T8, Toyota Dyna.
- suv = todo lo alto con portón: Trailblazer, Tahoe, Captiva, Tracker, Grand Vitara, Vitara, Jimny, S-Cross,
  Fortuner, Land Cruiser, Prado, 4Runner, RAV4, Rush, Corolla Cross, Expedition, Explorer, Escape, EcoSport, Bronco,
  Tiggo, Haval, Creta, Tucson, Santa Fe, Kona, Sportage, Seltos, Stonic, CR-V, CX-3, CX-30, CX-5, Montero, Outlander,
  Kicks, Qashqai, X-Trail, Peugeot 2008/3008/5008, Duster, T-Cross, Wrangler, Jetour X70/Dashing/Traveller/T1,
  BYD Yuan, DFSK Glory, Dongfeng SX5, Soueast DX3, Shineray SWM, JAC S5, Brilliance V3, CS35, FAW Bestune.
- sedan: Corolla, Yaris sedán, Sentra, Tiida, Sonata, Ioniq, Optra, Sail, Alsvin, Arrizo, Mazda3, Golf sedán, Audi A4,
  Mercedes-Benz Clase C. hatchback: Picanto, Swift, QQ, Polo, Fiat 500, Citroën C3, Grand i10, Onix, Kwid, Stepway,
  Audi A1, MINI Cooper. van: Hyundai H1, VW Kombi, Fiat Fiorino, Kia Carens, furgones JAC.
- deportivo: Camaro, Mustang, MX-5, MX-3, GT86, GTI y similares (cupés y deportivos de verdad; un Beetle no lo es).
- gama: súper premium = Porsche, Land Rover/Range Rover, Maserati, Bentley, Ferrari y los tope de gama de las premium
  (AMG, Clase G/S, GLE/GLS, BMW X5–X7 y M, Audi Q7/Q8/RS/R8, Lexus LX). premium = Mercedes-Benz, BMW, Audi, MINI,
  Volvo, Lexus y similares. El resto es gama normal.
- Marcas mal escritas en el inventario: "Mercedez Benz" = Mercedes-Benz, "Porshe" = Porsche, "Susuki" = Suzuki.`
