import { createClient } from "@/lib/supabase/client";
import type {
  CarteraClienteMensajeRow,
  CarteraMensajeEnvioUpdate,
} from "@/types/carteraMensajes.types";

const SELECT_COLS =
  "id, cliente_id, nombre, telefono, deuda, estado, etapa_cobranza, fecha_vencimiento, numero_cambiado, razon_no_envio, fecha_ultimo_envio, proximo_envio_at, updated_at";

export const carteraMensajesService = {
  /** Solo clientes de cartera_clientes en cobranza (excluye pagados). */
  async list(): Promise<CarteraClienteMensajeRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cartera_clientes")
      .select(SELECT_COLS)
      .neq("estado", "pagado")
      .order("nombre", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CarteraClienteMensajeRow[];
  },

  async updateEnvio(
    id: number,
    payload: CarteraMensajeEnvioUpdate,
  ): Promise<CarteraClienteMensajeRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cartera_clientes")
      .update({
        numero_cambiado: payload.numero_cambiado,
        razon_no_envio: payload.numero_cambiado
          ? payload.razon_no_envio?.trim() || null
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_COLS)
      .single();
    if (error) throw error;
    return data as CarteraClienteMensajeRow;
  },
};
