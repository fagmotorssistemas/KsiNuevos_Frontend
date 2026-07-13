/** Cliente de cartera_clientes para control de mensajes de recuperación. */

export interface CarteraClienteMensajeRow {
  id: number;
  cliente_id: string;
  nombre: string | null;
  telefono: string | null;
  deuda: number;
  estado: string;
  etapa_cobranza: string | null;
  fecha_vencimiento: string | null;
  /** true = no enviar mensajes automáticos */
  numero_cambiado: boolean;
  razon_no_envio: string | null;
  fecha_ultimo_envio: string | null;
  proximo_envio_at: string | null;
  updated_at: string;
}

export type CarteraMensajeEnvioUpdate = {
  numero_cambiado: boolean;
  razon_no_envio: string | null;
};
