// Tipos para la tabla brokers (Supabase)

export interface Broker {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  empresa: string | null;
  porcentaje_comision: number | null;
  activo: boolean | null;
  created_at: string | null;
}

export interface BrokerInsert {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  empresa?: string | null;
  porcentaje_comision?: number | null;
  activo?: boolean;
}

export interface BrokerUpdate extends Partial<BrokerInsert> {}
