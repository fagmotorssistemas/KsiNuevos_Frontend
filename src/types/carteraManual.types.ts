/** Obligación registrada manualmente (sin Oracle). */

export type CarteraManualEstado =
  | "vigente"
  | "regularizado"
  | "judicial"
  | "castigado"
  | "cerrado";

export interface CarteraManualRow {
  id: string;
  nombre_completo: string;
  identificacion: string | null;
  telefono_1: string | null;
  telefono_2: string | null;
  email: string | null;
  direccion: string | null;
  vehiculo_marca: string | null;
  vehiculo_modelo: string | null;
  vehiculo_anio: string | null;
  vehiculo_placa: string | null;
  fecha_venta: string | null;
  monto_original: number | null;
  saldo_actual: number;
  valor_cuota: number | null;
  numero_cuotas_total: number | null;
  numero_cuotas_pagadas: number;
  frecuencia_pago: string | null;
  proximo_vencimiento: string | null;
  dias_mora: number;
  estado_operacion: CarteraManualEstado;
  notas_internas: string | null;
  activo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Campos para alta desde el formulario (el servicio completa dias_mora, created_by). */
export type CarteraManualCreatePayload = Omit<
  CarteraManualRow,
  "id" | "created_at" | "updated_at" | "created_by"
>;

export type CarteraManualUpdate = Partial<
  Omit<CarteraManualRow, "id" | "created_at" | "created_by">
>;
