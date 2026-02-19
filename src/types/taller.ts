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
    // Datos expandidos (Joined)
    cliente?: Partial<ClienteTaller>; 
    
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

    // --- NUEVOS CAMPOS PARA EXPEDIENTES ---
    fecha_salida_real?: string;
    pdf_url?: string;
    total_final_cliente?: number;
    transacciones?: TransaccionFinanciera[];
    
    checklist_ingreso: Record<string, boolean>;
    inventario_pertenencias: Record<string, boolean>;
    observaciones_ingreso?: string;
    fotos_ingreso_urls: string[];
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
    tipo: 'ingreso' | 'gasto_operativo' | 'pago_proveedor' | 'nomina';
    monto: number;
    descripcion: string;
    fecha_transaccion: string;
    comprobante_url?: string;
    cuenta_id: string;
    orden_id?: string;
    // Relations
    cuenta?: { nombre_cuenta: string };
    orden?: { numero_orden: number; vehiculo_placa: string };
    registrado_por?: { full_name: string };
}

export interface ConsumoMaterial {
    id: string;
    item_id: string;
    cantidad: number;
    fecha_consumo: string;
    orden_id: string;
    // Relations
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
    cantidad: number;
    total: number; // Campo generado
    mecanico_asignado_id?: string;
    estado_trabajo: string;
    // Relation
    mecanico?: { full_name: string };
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
    // Auxiliar para frontend
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
    profile_id: string;
    cargo: string;
    salario_mensual: number;
    fecha_ingreso?: string;
    activo: boolean;
    datos_bancarios?: string;
    // Join con Profiles para saber el nombre real
    profile?: { 
        full_name: string; 
        email: string; 
        phone: string;
        role?: string;
    };
}

export interface CandidatoProfile {
    id: string;
    full_name: string;
    email: string;
}