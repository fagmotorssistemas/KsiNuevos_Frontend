export type EmbudoEtapa = {
  etapa: number
  label: string
  seQuedaron: number
  alcanzaron: number
}

export type EmbudoConteo = {
  key: string
  label: string
  total: number
}

export type EmbudoVehiculo = {
  id: string
  nombre: string
  anio: number | null
  precio: number | null
  estado: string | null
  consultas: number
}

export type EmbudoRetoma = {
  retoma: number
  programadas: number
  enviadas: number
  respondieron: number
  pendientes: number
  canceladas: number
}

export type EmbudoPasoFotos = {
  paso: number
  label: string
  programadas: number
  enviadas: number
  pendientes: number
  canceladas: number
}

export type EmbudoSenal = {
  id: number
  key: string
  label: string
  negativa: boolean
  fragmento: string | null
  detalle: string | null
  origen: string
  detectada: string | null
}

export type EmbudoCambioTemperatura = {
  de: string
  a: string
  deLabel: string
  aLabel: string
  sube: boolean
  total: number
}

export type EmbudoSenales = {
  total: number
  leads: number
  desde: string | null
  tipos: (EmbudoConteo & { negativa: boolean })[]
  origenes: EmbudoConteo[]
  temperatura: {
    total: number
    subieron: number
    bajaron: number
    cambios: EmbudoCambioTemperatura[]
  }
}

export type EmbudoConversacion = {
  id: string
  leadId: number | null
  leadIdKommo: number | null
  nombre: string
  etapa: number | null
  etapaLabel: string
  objecion: string | null
  objecionLabel: string
  objecionTexto: string | null
  objecionEvidencia: string | null
  resumen: string | null
  presupuestoMonto: number | null
  presupuestoDeclarado: string | null
  analizadoHasta: string | null
  cerradaAt: string | null
  entradaDisponible: number | null
  formaPago: string | null
  segmento: string | null
  segmentoLabel: string
  seguimiento: string | null
  seguimientoLabel: string
  cerrada: boolean
  precioMax: number | null
  humano: boolean
  actualizado: string | null
  senales: EmbudoSenal[]
}

export type EmbudoPanel = {
  programadas: number
  enviadas: number
  pendientes: number
  canceladas: number
  motivos: EmbudoConteo[]
}

export type EmbudoPayload = {
  totales: {
    conversaciones: number
    cerradas: number
    seguimientoActivo: number
    seguimientoAplazado: number
    seguimientoCerrado: number
    sinObjecion: number
    sinSegmento: number
  }
  porDia: { fecha: string; total: number }[]
  embudo: EmbudoEtapa[]
  objeciones: EmbudoConteo[]
  tickets: EmbudoConteo[]
  vehiculos: EmbudoVehiculo[]
  retomas: EmbudoPanel & {
    respondieron: number
    tasaRespuesta: number
    porRetoma: EmbudoRetoma[]
  }
  postFotos: EmbudoPanel & {
    porPaso: EmbudoPasoFotos[]
  }
  senales: EmbudoSenales
  conversaciones: EmbudoConversacion[]
}
