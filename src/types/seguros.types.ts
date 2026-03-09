// src/types/seguros.types.ts

// 1. Lectura desde API Legacy (Para el Listado)
export interface SeguroVehicular {
    id: string;
    referencia: string;     // Nota de venta
    fechaEmision: string;
    
    cliente: {
        nombre: string;
        identificacion: string;
        ubicacion: string;
    };

    bienAsegurado: {
        descripcion: string; // Marca + Modelo
        placa: string;
        tipo: string;
    };

    valores: {
        seguro: number;
        rastreo: number;
        total: number;
    };
    
    estado: 'ACTIVO' | 'PENDIENTE';
}

// 2. Tabla seguros_polizas (Supabase) - venta/registro de póliza por nota_venta
export interface SeguroPolizaRow {
    id: string;
    referencia: string | null;
    numero_certificado: string | null;
    aseguradora_id: string | null;
    broker_id: string | null;
    fecha_compra: string | null;
    costo_compra: number;
    factura_aseguradora: string | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
    plan_tipo: string | null;
    observaciones_compra: string | null;
    fecha_venta: string | null;
    precio_venta: number;
    nota_venta: string | null;
    evidencias: string[];
    observaciones_venta: string | null;
    vendido: boolean;
    activo: boolean;
    created_at: string | null;
    updated_at: string | null;
}

// Payload para crear/actualizar en seguros_polizas (emitir o renovar = otra compra/venta)
export interface SeguroPayload {
    nota_venta: string;
    aseguradora_id: string;
    broker_id: string;
    plan_tipo: string;
    costo_compra: number;
    precio_venta: number;
    fecha_venta?: string | null;
    vigencia_desde?: string | null;
    vigencia_hasta?: string | null;
    evidencias?: string[];
    observaciones_venta?: string | null;
}
  
// Lectura desde Supabase con nombres (join opcional)
export interface SeguroRegistrado extends SeguroPolizaRow {
    aseguradora?: { nombre: string } | null;
    broker?: { nombre: string } | null;
}