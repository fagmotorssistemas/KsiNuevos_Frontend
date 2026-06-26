import { Comprobante, ComprobanteImagen } from '@/types/comprobantes.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/** Token numérico JSON completo (entero, decimal o notación científica). */
const JSON_NUMBER = String.raw`-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?`;

/** Oracle devuelve CCO_CODIGO como entero; JSON number lo corrompe en JS — preservar como string. */
function quoteJsonNumericField(text: string, field: string): string {
  const re = new RegExp(`"${field}"\\s*:\\s*(${JSON_NUMBER})`, 'g');
  return text.replace(re, `"${field}":"$1"`);
}

function parseJsonPreservingCcoCodigo<T>(text: string): T {
  const safe = ['ccoCodigo', 'CCO_CODIGO'].reduce(
    (acc, field) => quoteJsonNumericField(acc, field),
    text
  );
  return JSON.parse(safe) as T;
}

/** Normaliza ccoCodigo tras parse: rechaza notación científica (número ya corrupto). */
export function normalizeCcoCodigo(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (/^\d+$/.test(s)) return s;
  return null;
}

/** Lanza un error tipado con el `message` y `code` del JSON de error del backend */
async function throwApiError(res: Response): Promise<never> {
  let body: { message?: string; code?: string } = {};
  try {
    body = await res.json();
  } catch {
    // si el body no es JSON, usamos el status text
  }
  const err = new Error(body.message || `HTTP ${res.status}`) as Error & { code?: string };
  err.code = body.code;
  throw err;
}

export const comprobantesService = {
  /** GET /comprobantes/listado?empresa={empresa} */
  async getListado(empresa?: number): Promise<Comprobante[]> {
    const qs = empresa !== undefined ? `?empresa=${empresa}` : '';
    const res = await fetch(`${API_URL}/comprobantes/listado${qs}`);
    if (!res.ok) return throwApiError(res);
    let json: { data: Comprobante[] };
    try {
      json = parseJsonPreservingCcoCodigo<{ data: Comprobante[] }>(await res.text());
    } catch {
      throw new Error(
        'No se pudo leer el listado de comprobantes. Pide al backend que envíe ccoCodigo como string en el JSON.'
      );
    }
    return json.data.map((c) => ({
      ...c,
      ccoCodigo: normalizeCcoCodigo(c.ccoCodigo) ?? c.ccoCodigo,
    }));
  },

  /** GET /comprobantes/:ccoCodigo/imagenes?empresa={empresa} */
  async getImagenes(ccoCodigo: string, empresa?: number): Promise<ComprobanteImagen[]> {
    const qs = empresa !== undefined ? `?empresa=${empresa}` : '';
    const res = await fetch(`${API_URL}/comprobantes/${encodeURIComponent(ccoCodigo)}/imagenes${qs}`);
    if (!res.ok) return throwApiError(res);
    const json = parseJsonPreservingCcoCodigo<{ data: ComprobanteImagen[] }>(await res.text());
    return json.data;
  },

  /**
   * POST /api/comprobantes/:ccoCodigo  (Next.js API Route — mismo origen, sin CORS)
   *
   * El navegador llama a la ruta interna de Next.js, que actúa como proxy hacia el
   * Express backend. Esto evita los errores "Headers is not defined" y problemas de
   * preflight CORS que ocurren al llamar directamente al backend desde el browser.
   *
   * El backend Express es quien sube el binario a Supabase Storage y registra la URL
   * en Oracle. El front NUNCA toca Supabase Storage directamente.
   */
  async uploadImagen(
    ccoCodigo: string,
    file: File,
    usuario: string,
    empresa?: number
  ): Promise<ComprobanteImagen> {
    const qs = empresa !== undefined ? `?empresa=${empresa}` : '';
    const form = new FormData();
    form.append('file', file);
    form.append('creaUsr', usuario);

    // Llamamos a la API Route de Next.js (mismo origen → sin CORS, sin preflight)
    const res = await fetch(`/api/comprobantes/${encodeURIComponent(ccoCodigo)}${qs}`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return throwApiError(res);
    const json = await res.json();
    return json.data.imagen as ComprobanteImagen;
  },

  /** DELETE /comprobantes/:ccoCodigo/imagenes/:ccoSecuencia?empresa={empresa} */
  async deleteImagen(
    ccoCodigo: string,
    ccoSecuencia: number,
    empresa?: number
  ): Promise<void> {
    const qs = empresa !== undefined ? `?empresa=${empresa}` : '';
    const res = await fetch(
      `${API_URL}/comprobantes/${encodeURIComponent(ccoCodigo)}/imagenes/${ccoSecuencia}${qs}`,
      { method: 'DELETE' }
    );
    if (!res.ok) return throwApiError(res);
  },
};
