const DIALOG_KEY = 'ksi.consultaDialog.v1'
const SATJE_KEY = 'ksi.satjeOwner.v1'

export type ConsultaDialogPanel = 'unificada' | 'propietario'

export type ConsultaDialogSession = {
  open: boolean
  panel: ConsultaDialogPanel
}

export type SatjeOwnerSession = {
  nombre: string
  cedula: string
  placa: string
  ruc: string
  consultaId: string | null
  progressOpen: boolean
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function readConsultaDialogSession(): ConsultaDialogSession {
  const saved = readJson<ConsultaDialogSession>(DIALOG_KEY)
  if (!saved) return { open: false, panel: 'unificada' }
  return {
    open: Boolean(saved.open),
    panel: saved.panel === 'propietario' ? 'propietario' : 'unificada',
  }
}

export function writeConsultaDialogSession(value: ConsultaDialogSession): void {
  try {
    sessionStorage.setItem(DIALOG_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function readSatjeOwnerSession(): SatjeOwnerSession | null {
  const saved = readJson<SatjeOwnerSession>(SATJE_KEY)
  if (!saved) return null
  return {
    nombre: typeof saved.nombre === 'string' ? saved.nombre : '',
    cedula: typeof saved.cedula === 'string' ? saved.cedula : '',
    placa: typeof saved.placa === 'string' ? saved.placa : '',
    ruc: typeof saved.ruc === 'string' ? saved.ruc : '',
    consultaId: typeof saved.consultaId === 'string' ? saved.consultaId : null,
    progressOpen: Boolean(saved.progressOpen),
  }
}

export function writeSatjeOwnerSession(value: SatjeOwnerSession): void {
  try {
    sessionStorage.setItem(SATJE_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
