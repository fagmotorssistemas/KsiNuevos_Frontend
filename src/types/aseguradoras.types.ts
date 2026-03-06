// Tipos para la tabla aseguradoras (Supabase)

export interface Aseguradora {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;

  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;

  porcentaje_base_seguro: number | null;
  trabaja_con_gps: boolean;
  activa: boolean;

  observaciones: string | null;
  created_at: string | null;
}

export interface AseguradoraInsert {
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  porcentaje_base_seguro?: number | null;
  trabaja_con_gps?: boolean;
  activa?: boolean;
  observaciones?: string | null;
}

export interface AseguradoraUpdate extends Partial<AseguradoraInsert> {}
