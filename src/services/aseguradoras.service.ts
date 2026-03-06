import { createClient } from "@supabase/supabase-js";
import type { Aseguradora, AseguradoraInsert, AseguradoraUpdate } from "@/types/aseguradoras.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE = "aseguradoras";

export const aseguradorasService = {
  async listar(): Promise<Aseguradora[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("nombre", { ascending: true });
    if (error) {
      console.error("aseguradorasService.listar:", error);
      throw error;
    }
    return (data as Aseguradora[]) ?? [];
  },

  async listarActivas(): Promise<Aseguradora[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("activa", true)
      .order("nombre", { ascending: true });
    if (error) {
      console.error("aseguradorasService.listarActivas:", error);
      throw error;
    }
    return (data as Aseguradora[]) ?? [];
  },

  async obtenerPorId(id: string): Promise<Aseguradora | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("aseguradorasService.obtenerPorId:", error);
      throw error;
    }
    return data as Aseguradora | null;
  },

  async crear(payload: AseguradoraInsert): Promise<{ data: Aseguradora | null; error: Error | null }> {
    const insert: Record<string, unknown> = {
      nombre: payload.nombre.trim(),
      ruc: payload.ruc?.trim() || null,
      telefono: payload.telefono?.trim() || null,
      email: payload.email?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      contacto_nombre: payload.contacto_nombre?.trim() || null,
      contacto_telefono: payload.contacto_telefono?.trim() || null,
      contacto_email: payload.contacto_email?.trim() || null,
      porcentaje_base_seguro: payload.porcentaje_base_seguro ?? null,
      trabaja_con_gps: payload.trabaja_con_gps ?? false,
      activa: payload.activa ?? true,
      observaciones: payload.observaciones?.trim() || null,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(insert)
      .select()
      .single();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Aseguradora, error: null };
  },

  async actualizar(id: string, payload: AseguradoraUpdate): Promise<{ data: Aseguradora | null; error: Error | null }> {
    const update: Record<string, unknown> = {};
    if (payload.nombre !== undefined) update.nombre = payload.nombre.trim();
    if (payload.ruc !== undefined) update.ruc = payload.ruc?.trim() || null;
    if (payload.telefono !== undefined) update.telefono = payload.telefono?.trim() || null;
    if (payload.email !== undefined) update.email = payload.email?.trim() || null;
    if (payload.direccion !== undefined) update.direccion = payload.direccion?.trim() || null;
    if (payload.contacto_nombre !== undefined) update.contacto_nombre = payload.contacto_nombre?.trim() || null;
    if (payload.contacto_telefono !== undefined) update.contacto_telefono = payload.contacto_telefono?.trim() || null;
    if (payload.contacto_email !== undefined) update.contacto_email = payload.contacto_email?.trim() || null;
    if (payload.porcentaje_base_seguro !== undefined) update.porcentaje_base_seguro = payload.porcentaje_base_seguro;
    if (payload.trabaja_con_gps !== undefined) update.trabaja_con_gps = payload.trabaja_con_gps;
    if (payload.activa !== undefined) update.activa = payload.activa;
    if (payload.observaciones !== undefined) update.observaciones = payload.observaciones?.trim() || null;

    const { data, error } = await supabase
      .from(TABLE)
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Aseguradora, error: null };
  },

  async eliminar(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    return { error: error ? (error as unknown as Error) : null };
  },
};
