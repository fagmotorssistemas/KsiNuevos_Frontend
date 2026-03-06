import { createClient } from "@supabase/supabase-js";
import type { SeguroPoliza, SeguroPolizaInsert, SeguroPolizaUpdate } from "@/types/seguros-polizas.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE = "seguros_polizas";

function toDb(obj: SeguroPolizaInsert | SeguroPolizaUpdate): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (obj.referencia !== undefined) r.referencia = obj.referencia?.trim() || null;
  if (obj.numero_certificado !== undefined) r.numero_certificado = obj.numero_certificado?.trim() || null;
  if (obj.aseguradora_id !== undefined) r.aseguradora_id = obj.aseguradora_id || null;
  if (obj.fecha_compra !== undefined) r.fecha_compra = obj.fecha_compra || null;
  if (obj.costo_compra !== undefined) r.costo_compra = obj.costo_compra;
  if (obj.factura_aseguradora !== undefined) r.factura_aseguradora = obj.factura_aseguradora?.trim() || null;
  if (obj.vigencia_desde !== undefined) r.vigencia_desde = obj.vigencia_desde || null;
  if (obj.vigencia_hasta !== undefined) r.vigencia_hasta = obj.vigencia_hasta || null;
  if (obj.plan_tipo !== undefined) r.plan_tipo = obj.plan_tipo?.trim() || null;
  if (obj.observaciones_compra !== undefined) r.observaciones_compra = obj.observaciones_compra?.trim() || null;
  if (obj.cliente_nombre !== undefined) r.cliente_nombre = obj.cliente_nombre?.trim() || null;
  if (obj.cliente_identificacion !== undefined) r.cliente_identificacion = obj.cliente_identificacion?.trim() || null;
  if (obj.cliente_telefono !== undefined) r.cliente_telefono = obj.cliente_telefono?.trim() || null;
  if (obj.cliente_email !== undefined) r.cliente_email = obj.cliente_email?.trim() || null;
  if (obj.vehiculo_descripcion !== undefined) r.vehiculo_descripcion = obj.vehiculo_descripcion?.trim() || null;
  if (obj.vehiculo_placa !== undefined) r.vehiculo_placa = obj.vehiculo_placa?.trim() || null;
  if (obj.fecha_venta !== undefined) r.fecha_venta = obj.fecha_venta || null;
  if (obj.precio_venta !== undefined) r.precio_venta = obj.precio_venta;
  if (obj.nota_venta !== undefined) r.nota_venta = obj.nota_venta?.trim() || null;
  if (obj.broker !== undefined) r.broker = obj.broker?.trim() || null;
  if (obj.evidencias !== undefined) r.evidencias = obj.evidencias ?? [];
  if (obj.observaciones_venta !== undefined) r.observaciones_venta = obj.observaciones_venta?.trim() || null;
  if (obj.vendido !== undefined) r.vendido = obj.vendido;
  if (obj.activo !== undefined) r.activo = obj.activo;
  return r;
}

export const segurosPolizasService = {
  async listar(): Promise<SeguroPoliza[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as SeguroPoliza[]) ?? [];
  },

  async listarCompras(soloNoVendidas?: boolean): Promise<SeguroPoliza[]> {
    let q = supabase.from(TABLE).select("*").order("fecha_compra", { ascending: false });
    if (soloNoVendidas === true) q = q.eq("vendido", false);
    const { data, error } = await q;
    if (error) throw error;
    return (data as SeguroPoliza[]) ?? [];
  },

  async listarVentas(): Promise<SeguroPoliza[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("vendido", true)
      .order("fecha_venta", { ascending: false });
    if (error) throw error;
    return (data as SeguroPoliza[]) ?? [];
  },

  async obtenerPorId(id: string): Promise<SeguroPoliza | null> {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as SeguroPoliza | null;
  },

  async crear(payload: SeguroPolizaInsert): Promise<{ data: SeguroPoliza | null; error: Error | null }> {
    const insert = toDb(payload);
    const { data, error } = await supabase.from(TABLE).insert(insert).select().single();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as SeguroPoliza, error: null };
  },

  async actualizar(id: string, payload: SeguroPolizaUpdate): Promise<{ data: SeguroPoliza | null; error: Error | null }> {
    const update = toDb(payload);
    (update as Record<string, unknown>).updated_at = new Date().toISOString();
    const { data, error } = await supabase.from(TABLE).update(update).eq("id", id).select().single();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as SeguroPoliza, error: null };
  },

  async eliminar(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    return { error: error ? (error as unknown as Error) : null };
  },
};
