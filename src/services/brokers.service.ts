import { createClient } from "@supabase/supabase-js";
import type { Broker, BrokerInsert, BrokerUpdate } from "@/types/brokers.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE = "brokers";

export const brokersService = {
  async listar(): Promise<Broker[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("nombre", { ascending: true });
    if (error) {
      console.error("brokersService.listar:", error);
      throw error;
    }
    return (data as Broker[]) ?? [];
  },

  async listarActivos(): Promise<Broker[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .or("activo.eq.true,activo.is.null")
      .order("nombre", { ascending: true });
    if (error) {
      console.error("brokersService.listarActivos:", error);
      throw error;
    }
    return (data as Broker[]) ?? [];
  },

  async obtenerPorId(id: string): Promise<Broker | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("brokersService.obtenerPorId:", error);
      throw error;
    }
    return data as Broker | null;
  },

  async crear(payload: BrokerInsert): Promise<{ data: Broker | null; error: Error | null }> {
    const insert: Record<string, unknown> = {
      nombre: payload.nombre.trim(),
      telefono: payload.telefono?.trim() || null,
      email: payload.email?.trim() || null,
      empresa: payload.empresa?.trim() || null,
      porcentaje_comision: payload.porcentaje_comision ?? null,
      activo: payload.activo ?? true,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(insert)
      .select()
      .single();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Broker, error: null };
  },

  async actualizar(id: string, payload: BrokerUpdate): Promise<{ data: Broker | null; error: Error | null }> {
    const update: Record<string, unknown> = {};
    if (payload.nombre !== undefined) update.nombre = payload.nombre.trim();
    if (payload.telefono !== undefined) update.telefono = payload.telefono?.trim() || null;
    if (payload.email !== undefined) update.email = payload.email?.trim() || null;
    if (payload.empresa !== undefined) update.empresa = payload.empresa?.trim() || null;
    if (payload.porcentaje_comision !== undefined) update.porcentaje_comision = payload.porcentaje_comision;
    if (payload.activo !== undefined) update.activo = payload.activo;

    const { data, error } = await supabase
      .from(TABLE)
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Broker, error: null };
  },

  async eliminar(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    return { error: error ? (error as unknown as Error) : null };
  },
};
