export interface ContratoGPS {
    // Identificadores
    ccoCodigo: string;      
    notaVenta: string;      
    nroContrato: string;    // Este es el campo que daba error
    
    // Cliente
    cliente: string;        
    ruc: string;            
    telefono?: string;      
    email?: string;         
    
    // Vehículo
    placa: string;          
    marca: string;
    modelo: string;
    color: string;
    anio: string;
    
    // Económico
    totalRastreador: number;
    totalFinal?: number;              // ✨ NUEVO: Total financiado del contrato
    cuotaMensual?: number;             // ✨ NUEVO: Valor de la cuota mensual
    numeroCuotas?: number;             // ✨ NUEVO: Plazo total de cuotas
    
    // Fecha
    fechaInstalacion: string; 
    
    // --- CONTROL DE ORIGEN ---
    origen: 'AUTO' | 'EXTERNO';
    clienteExternoId?: string;
    // Venta externa a concesionaria (B2B)
    esConcesionaria?: boolean;
    nombreConcesionaria?: string | null;
    clienteFinalNombre?: string | null;
    clienteFinalIdentificacion?: string | null;
    clienteFinalTelefono?: string | null;
}

/** Datos para clientes_externos (BD: nombre_completo, identificacion, telefono, email, direccion). Placa/marca/modelo van en vehiculos. */
export interface ClienteExternoPayload {
    nombre: string;
    identificacion: string;
    telefono: string;
    email: string;
    direccion?: string | null;
    placa: string;
    marca: string;
    modelo: string;
    anio: string;
    color: string;
}

/** Concesionaria a la que se vende (B2B) */
export interface Concesionaria {
    id: string;
    nombre: string;
    ruc: string;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    created_at?: string | null;
}

/** Datos del cliente final (a quién la concesionaria le venderá el equipo) */
export interface ClienteFinalPayload {
    nombre: string;
    identificacion: string;
    telefono: string;
}

/** Payload para crear o actualizar concesionaria */
export interface ConcesionariaPayload {
    nombre: string;
    ruc: string;
    direccion?: string;
    telefono?: string;
    email?: string;
}

export interface RegistroGPSPayload {
    identificacion_cliente: string;
    nota_venta: string;
    imei: string;
    modelo: string;
    tipo_dispositivo: string;
    costo_compra: number;
    precio_venta: number;
    proveedor: string;
    pagado: boolean;
    metodo_pago: string;
    evidencias?: string[];
    // Opcionales para soporte externo
    cliente_externo_id?: string;
    es_venta_externa?: boolean;
    // Venta a concesionaria (B2B)
    es_concesionaria?: boolean;
    nombre_concesionaria?: string;
    concesionaria_id?: string | null;
    cliente_final_nombre?: string | null;
    cliente_final_identificacion?: string | null;
    cliente_final_telefono?: string | null;
    // Campos adicionales para vinculación
    sim_id?: string;
    instalador_id?: string;
    costo_instalacion?: number;
}

// Tipos de Inventario
export interface ProveedorGPS {
    id: string;
    nombre: string;
}

export interface ModeloGPS {
    id: string;
    /** Nombre visible del modelo (en BD es `marca`) */
    marca: string | null;
    costo_referencia: number;
    /** Relación opcional: el modelo puede depender del proveedor */
    provedor_id?: string | null;
}

/** Estado de conexión del dispositivo en inventario (individual por unidad) */
export type EstadoConeccionGPS = 'online' | 'inactivo' | 'offline';

export interface InventarioGPS {
    id: string;
    imei: string;
    modelo: ModeloGPS;
    proveedor: ProveedorGPS;
    costo_compra: number;
    estado: 'STOCK' | 'VENDIDO' | 'RMA' | 'BAJA' | 'INSTALADO';
    /** Estado de conexión: online, inactivo, offline */
    estado_coneccion?: EstadoConeccionGPS | null;
    fecha_compra: string;
}

export interface IngresoGPSPayload {
    imei: string;
    modelo_id: string;
    proveedor_id: string;
    costo_compra: number;
    factura_compra: string;
    estado_coneccion?: EstadoConeccionGPS;
    serie?: string;
    /** Opcional: vincular SIM al GPS (tabla gps_sims). Si hay varios IMEIs, se vincula al primero. */
    iccid?: string;
    imsi?: string;
}

/** Alineado con gps_sims (id, iccid, created_at, gps_id, imsi). estado se deriva: gps_id null = STOCK, sino ACTIVA. */
export interface InventarioSIM {
    id: string;
    iccid: string;
    created_at: string;
    gps_id?: string | null;
    imsi?: string | null;
    estado: 'STOCK' | 'ACTIVA' | 'SUSPENDIDA' | 'BAJA';
    numero?: string | null;
    operadora?: string | null;
    costo_mensual?: number | null;
}

export interface IngresoSIMPayload {
    iccid: string;
    imsi?: string;
}

// Añadir en types/rastreadores.types.ts
export interface Instalador {
    id: string;
    nombre: string;
    telefono: string | null;
    valor_por_instalacion: number;
    activo: boolean;
    created_at: string;
}
export interface NuevoInstaladorPayload {
    nombre: string;
    telefono?: string;
    valor_por_instalacion?: number;
}

// ✨ NUEVOS TIPOS PARA MÓDULO DE PAGO DEL RASTREADOR
export enum TipoPagoEnum {
    CONTADO = 'CONTADO',
    CREDITO = 'CREDITO'
}

/** Cómo se realizó el pago: efectivo, transferencia, depósito o cheque */
export enum MetodoPagoRastreadorEnum {
    EFECTIVO = 'EFECTIVO',
    TRANSFERENCIA = 'TRANSFERENCIA',
    DEPOSITO = 'DEPOSITO',
    CHEQUE = 'CHEQUE'
}

export interface PagoRastreadorInfo {
    // Cálculos base
    totalFinal: number;
    monto_rastreador: number;
    porcentaje_rastreador: number;           // 0.02 = 2%
    
    // Cuotas
    cuota_mensual: number;
    valor_rastreador_mensual: number;        // parte que corresponde al GPS en cada cuota
    numero_cuotas_credito?: number;          // cuántas cuotas el cliente tiene
    
    // Tipo de pago
    tipo_pago: TipoPagoEnum;
    abono_inicial?: number;
    /** Cómo se realizó el pago (efectivo, transferencia, depósito, cheque) */
    metodo_pago_medio?: MetodoPagoRastreadorEnum;
    /** URL del comprobante subido (foto cheque, captura transferencia, comprobante depósito) */
    url_comprobante_pago?: string;
}

/** Para el formulario: archivo de comprobante antes de subir */
export type PagoRastreadorFormInfo = PagoRastreadorInfo & {
    tipo_pago: TipoPagoEnum;
    comprobante_pago_file?: File | null;
};

export interface VentaRastreadorPayload {
    /** ID del GPS en gps_inventario (ventas_rastreador.gps_id) */
    gps_id: string;
    entorno: 'CON_VEHICULO' | 'SIN_VEHICULO';
    tipo_pago: TipoPagoEnum;
    precio_total: number;           // Precio del GPS
    abono_inicial?: number;
    total_financiado?: number;
    numero_cuotas?: number;
    /** Cómo se realizó: EFECTIVO | TRANSFERENCIA | DEPOSITO | CHEQUE */
    metodo_pago?: MetodoPagoRastreadorEnum | string;
    /** URL del comprobante (foto cheque, captura transferencia, comprobante depósito) */
    url_comprobante_pago?: string | null;
    /** Fecha de entrega (tabla ventas_rastreador) */
    fecha_entrega?: string | null;
    /** ID del asesor que vendió (profiles con rol vendedor o admin) */
    asesor_id?: string | null;
    /** Observación de la venta/instalación (ej: SE INSTALA SIN NOVEDAD, vehículo, placas, notas) */
    observacion?: string | null;
    /** Nota de venta del contrato (Oracle/KSI Nuevos), para identificar historial por ventas_rastreador.nota_venta */
    nota_venta?: string | null;
    /** ID del instalador (ventas_rastreador.instalador_id) */
    instalador_id?: string | null;
    /** Costo de instalación (ventas_rastreador.costo_instalacion) */
    costo_instalacion?: number | null;
}

export interface CuotaRastreadorPayload {
    venta_id: string;
    numero_cuota: number;
    valor: number;
    fecha_vencimiento: string;
}

/** Payload de pago para venta externa: se guarda en ventas_rastreador + cuotas_rastreador (sin gps_id, lo resuelve el servicio) */
export interface PagoVentaExternaPayload {
    tipo_pago: TipoPagoEnum;
    precio_total: number;
    abono_inicial?: number;
    total_financiado?: number;
    numero_cuotas?: number;
    metodo_pago?: MetodoPagoRastreadorEnum | string;
    url_comprobante_pago?: string | null;
    fecha_entrega?: string | null;
    asesor_id?: string | null;
    observacion?: string | null;
    instalador_id?: string | null;
    costo_instalacion?: number | null;
    nota_venta?: string | null;
}