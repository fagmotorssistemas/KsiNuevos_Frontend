export type TallerEstadoOrden = 
    | 'recepcion' 
    | 'presupuesto' 
    | 'en_cola' 
    | 'en_proceso' 
    | 'control_calidad' 
    | 'terminado' 
    | 'entregado' 
    | 'cancelado';

export type TallerTipoItem = 'material' | 'herramienta' | 'repuesto';

export interface ClienteTaller {
    id: string;
    cedula_ruc: string;
    nombre_completo: string;
    telefono: string;
    email: string;
    direccion: string;
}

export interface OrdenTrabajo {
    id: string;
    numero_orden: number;
    cliente_id: string;
    cliente?: Partial<ClienteTaller>;
    created_by?: string | null;
    creado_por?: { full_name: string | null } | null;
    
    vehiculo_placa: string;
    vehiculo_marca: string;
    vehiculo_modelo: string;
    vehiculo_anio: number;
    vehiculo_color: string;
    vehiculo_vin: string;
    kilometraje: number;
    nivel_gasolina: number;
    
    estado: TallerEstadoOrden;
    fecha_ingreso: string;
    fecha_promesa_entrega?: string;

    fecha_salida_real?: string;
    pdf_url?: string;
    factura_numero?: string | null;
    factura_url?: string | null;
    total_final_cliente?: number;
    transacciones?: TransaccionFinanciera[];
    
    checklist_ingreso: Record<string, boolean>;
    inventario_pertenencias: Record<string, boolean>;
    observaciones_ingreso?: string;
    observaciones_ingreso_inicial?: string | null;
    fotos_ingreso_urls: string[];
    /** URLs de fotos de evidencia de salida (vehículo después del trabajo) */
    fotos_salida_urls?: string[] | null;
}

export interface InventarioItem {
    id: string;
    codigo_interno: string;
    nombre: string;
    descripcion?: string;
    tipo: TallerTipoItem;
    unidad_medida: string;
    stock_actual: number;
    stock_minimo: number;
    costo_promedio: number;
    precio_venta: number;
    ubicacion_bodega?: string;
}

export interface Cuenta {
    id: string;
    nombre_cuenta: string;
    saldo_actual: number;
    numero_cuenta: string;
    es_caja_chica: boolean;
}

export interface TransaccionFinanciera {
    id: string;
    tipo: string; 
    monto: number;
    descripcion: string;
    fecha_transaccion: string;
    forma_pago?: string | null;
    comprobante_url?: string;
    cuenta_id: string;
    orden_id?: string;
    // Relations actualizadas para el modal
    cuenta?: { nombre_cuenta: string };
    orden?: { 
        id: string;
        numero_orden: number; 
        vehiculo_placa: string;
        vehiculo_marca?: string;
        vehiculo_modelo?: string;
        estado?: string;
        cliente?: {
            nombre_completo: string;
            telefono: string;
        };
    };
    registrado_por?: { full_name: string };
}

export interface ConsumoMaterial {
    id: string;
    item_id: string;
    cantidad: number;
    fecha_consumo: string;
    orden_id: string;
    item?: { nombre: string; unidad_medida: string; costo_promedio: number };
    registrado_por?: { full_name: string };
}

export interface ServicioCatalogo {
    id: string;
    nombre_servicio: string;
    precio_sugerido: number;
    tiempo_estimado_horas?: number;
}

export interface DetalleOrden {
    id: string;
    orden_id: string;
    descripcion: string;
    precio_unitario: number;
    precio_unitario_inicial?: number | null;
    cantidad: number;
    total: number;
    estado_trabajo: string;
}

export type PresupuestoHistorialAction = 'agregar' | 'editar';

export interface PresupuestoHistorialRow {
    id: string;
    orden_id: string;
    changed_by: string | null;
    action: PresupuestoHistorialAction;
    descripcion: string | null;
    precio_unitario: number | null;
    cantidad: number | null;
    descripcion_anterior: string | null;
    precio_unitario_anterior: number | null;
    motivo: string | null;
    total_antes: number | null;
    total_despues: number | null;
    created_at: string;
    changed_by_profile?: { full_name: string | null } | null;
}

export interface ObservacionIngresoHistorialRow {
    id: string;
    orden_id: string;
    created_by: string | null;
    texto: string;
    es_inicial?: boolean;
    created_at: string;
    created_by_profile?: { full_name: string | null } | null;
}

export interface TallerProveedor {
    id: string;
    nombre_comercial: string;
    ruc?: string;
    telefono?: string;
    categoria?: string;
    contacto_nombre?: string;
    email?: string;
    dia_pago_habitual?: number;
    notas?: string;
    created_at?: string;
}

export interface GastoFijoConfig {
    id: string;
    nombre: string;
    monto_habitual: number;
    dia_limite_pago: number;
    activo: boolean;
    created_at?: string;
    ultimo_pago_mes?: PagoGasto | null; 
}

export interface PagoGasto {
    id: string;
    gasto_fijo_id: string;
    monto_pagado: number;
    fecha_pago: string;
    comprobante_url?: string;
    observacion?: string;
    registrado_por?: string;
}

export interface TallerPersonal {
    id: string;
    nombre_completo: string;
    telefono?: string | null;
    profile_id?: string | null;
    cargo: string;
    salario_mensual: number;
    fecha_ingreso?: string;
    activo: boolean;
    datos_bancarios?: string;
}

// Interfaz actualizada para manejar presupuesto real y gastos
export interface CuentaPorCobrar {
    id: string; 
    numero_orden: number;
    vehiculo_placa: string;
    vehiculo_marca: string;
    vehiculo_modelo: string;
    estado_contable: string;
    fecha_ingreso: string;
    cliente?: {
        nombre_completo: string;
        telefono: string;
    };
    transacciones?: {
        monto: number;
        tipo: string;
        fecha_transaccion: string;
        descripcion: string;
        forma_pago?: string | null;
    }[];
    consumos_materiales?: {
        id: string;
        cantidad: number;
        fecha_consumo: string;
        item?: { nombre: string; unidad_medida: string; costo_promedio?: number };
    }[];
    presupuesto: number;
    total_pagado: number;
    total_gastado: number;
    saldo_pendiente: number;
}