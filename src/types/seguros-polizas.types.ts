// Fichas: compra a aseguradora + reventa al cliente

export interface SeguroPoliza {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  referencia: string | null;
  numero_certificado: string | null;

  aseguradora_id: string | null;
  fecha_compra: string | null;
  costo_compra: number;
  factura_aseguradora: string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  plan_tipo: string | null;
  observaciones_compra: string | null;

  cliente_nombre: string | null;
  cliente_identificacion: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  vehiculo_descripcion: string | null;
  vehiculo_placa: string | null;
  fecha_venta: string | null;
  precio_venta: number;
  nota_venta: string | null;
  broker: string | null;
  evidencias: string[];
  observaciones_venta: string | null;

  vendido: boolean;
  activo: boolean;
}

export interface SeguroPolizaInsert {
  referencia?: string | null;
  numero_certificado?: string | null;
  aseguradora_id?: string | null;
  fecha_compra?: string | null;
  costo_compra?: number;
  factura_aseguradora?: string | null;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  plan_tipo?: string | null;
  observaciones_compra?: string | null;
  cliente_nombre?: string | null;
  cliente_identificacion?: string | null;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  vehiculo_descripcion?: string | null;
  vehiculo_placa?: string | null;
  fecha_venta?: string | null;
  precio_venta?: number;
  nota_venta?: string | null;
  broker?: string | null;
  evidencias?: string[];
  observaciones_venta?: string | null;
  vendido?: boolean;
  activo?: boolean;
}

export type SeguroPolizaUpdate = Partial<SeguroPolizaInsert>;
