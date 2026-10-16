export type AuditoriaCarroSort =
  | 'conversaciones'
  | 'agendo'
  | 'dias_en_patio'
  | 'gasto_ads'
  | 'visitas_patio'
  | 'vio_precio'
  | 'pidieron_rebaja'

export type AuditoriaCarroFilters = {
  status?: string | null
  soloConChat?: boolean
  sort?: AuditoriaCarroSort
  order?: 'asc' | 'desc'
}

export type AuditoriaCarroCaida = {
  de: string
  a: string
  deValor: number
  aValor: number
  perdidos: number
  tasaRetencion: number
}

export type AuditoriaCarroInsight =
  | 'cae_precio'
  | 'cae_cuota'
  | 'cae_agenda'
  | 'problema_patio'
  | 'ads_mal'
  | 'bajar_precio_no_funciona'
  | 'bot_ciego'
  | 'atrae_no_cierra'
  | 'ofertan_bajo'
  | 'piden_rebaja'
  | null

export type AuditoriaCarro = {
  inventoryId: string
  brand: string
  model: string
  nombre: string
  year: number | null
  price: number | null
  status: string | null
  location: string | null
  diasEnPatio: number | null
  conversaciones: number
  soloUnCarro: number
  /** % de conversaciones que solo miraron este carro */
  pctSoloUnCarro: number
  vioPrecio: number
  pidioCuota: number
  agendo: number
  visitoEmbudo: number
  visitasPatio: number
  testDrives: number
  objecionTop: string | null
  objecionTopLabel: string
  objPlata: number
  objCarro: number
  presupuestoProm: number | null
  entradaProm: number | null
  gastoAds: number
  leadsAds: number
  pendientesBot: number
  cambiosPrecio: number
  pidieronRebaja: number
  ofertas: number
  ofertaProm: number | null
  ofertaMax: number | null
  /** Positivo = ofrecen por debajo del precio publicado */
  ofertaBajoPrecioPct: number | null
  /** Caídas entre etapas del embudo bot */
  caidas: AuditoriaCarroCaida[]
  /** Etapa donde más gente se pierde (mayor pérdida absoluta) */
  peorCaida: AuditoriaCarroCaida | null
  insight: AuditoriaCarroInsight
  insightLabel: string | null
  /** Ciudad declarada por el cliente (leads.ciudad_cliente), de mayor a menor */
  ubicaciones: { ciudad: string; n: number }[]
  /** Conversaciones cuyo lead no tiene ciudad */
  sinUbicacion: number
  /** Atribución multi-carro poco fiable hasta que exista vehiculos_etapa */
  atribucionAproximada: boolean
}

export type AuditoriaCarroPayload = {
  carros: AuditoriaCarro[]
  totales: {
    carros: number
    conChat: number
    conversaciones: number
  }
  /** Aviso global: vehiculos_etapa aún no se llena */
  atribucionAproximada: boolean
}
