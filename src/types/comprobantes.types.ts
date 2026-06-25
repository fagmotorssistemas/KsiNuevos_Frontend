/**
 * Fila de la vista Oracle LIST_CCOMPROBA_V.
 * Los campos se reciben en camelCase desde el backend.
 * Se usan `unknown` en el índice para cubrir columnas adicionales que Oracle pueda devolver.
 */
export interface Comprobante {
  dspComproba?: string | null;
  ccoFecha?: string | null;
  ccoEmpresa?: number | null;
  /** ID Oracle; puede superar Number.MAX_SAFE_INTEGER — siempre tratarlo como string */
  ccoCodigo?: string | null;
  ccoPeriodo?: string | null;
  ccoSigla?: string | null;
  ccoAlmacen?: string | null;
  ccoSerie?: string | null;
  ccoNumero?: string | null;
  ccoDoctran?: string | null;
  ccoTipodoc?: string | null;
  ccoConcepto?: string | null;
  ccoModulo?: string | null;
  ccoNocontable?: string | null;
  ccoEstado?: string | null;
  ccoDescuadre?: number | null;
  ccoAdestino?: string | null;
  ccoPventa?: string | null;
  ccoCentro?: string | null;
  ccoTipoCambio?: number | null;
  ccoTclipro?: string | null;
  ccoCodclipro?: string | null;
  ccoAgente?: string | null;
  ccoCuenta?: string | null;
  ccoTransacc?: string | null;
  ccoCodclipro1?: string | null;
  ccoCieComproba?: string | null;
  ccoRefComproba?: string | null;
  ccoAnulado?: string | null;
  ccoAnuComproba?: string | null;
  ccoAutTipo?: string | null;
  creaUsr?: string | null;
  creaFecha?: string | null;
  modUsr?: string | null;
  modFecha?: string | null;
  ccoNivelAprob?: string | null;
  tpdId?: number | null;
  tpdNombre?: string | null;
  modCodigo?: string | null;
  modId?: number | null;
  modNombre?: string | null;
  ctiId?: number | null;
  ctiNombre?: string | null;
  ctiTipo?: string | null;
  ctiAutoriza?: string | null;
  almNombre?: string | null;
  almId?: number | null;
  ccoFechafin?: string | null;
  ccoMes?: number | null;
  cliId?: number | null;
  ccoNombre?: string | null;
  ccoValComproba?: number | null;
  [key: string]: unknown;
}

/** Registro de la tabla Oracle CCOMPROBA_IMAGEN */
export interface ComprobanteImagen {
  ccoEmpresa: number;
  ccoCodigo: string;
  ccoSecuencia: number;
  ccoUrl: string;
  creaUsr?: string | null;
  creaFecha?: string | null;
  modUsr?: string | null;
  modFecha?: string | null;
}

/** Respuesta de error estándar del backend */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}
