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
    
    // Fecha
    fechaInstalacion: string; 
    
    // --- CONTROL DE ORIGEN ---
    origen: 'AUTO' | 'EXTERNO';
    clienteExternoId?: string;
}

export interface ClienteExternoPayload {
    nombre: string;
    identificacion: string;
    telefono: string;
    email: string;
    placa: string;
    marca: string;
    modelo: string;
    anio: string;
    color: string;
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
    nombre: string;
    marca: string;
    costo_referencia: number;
}

export interface InventarioGPS {
    id: string;
    imei: string;
    modelo: ModeloGPS;
    proveedor: ProveedorGPS;
    costo_compra: number;
    estado: 'STOCK' | 'VENDIDO' | 'RMA' | 'BAJA' | 'INSTALADO';
    fecha_compra: string;
}

export interface IngresoGPSPayload {
    imei: string;
    modelo_id: string;
    proveedor_id: string;
    costo_compra: number;
    factura_compra: string;
    serie?: string;
}

// Añadir al final de tu archivo types/rastreadores.types.ts
export interface InventarioSIM {
    id: string;
    iccid: string;
    numero: string | null;
    operadora: string | null;
    estado: 'STOCK' | 'ACTIVA' | 'SUSPENDIDA' | 'BAJA'; // Ajusta según tus estados reales
    costo_mensual: number | null;
    created_at: string;
}

export interface IngresoSIMPayload {
    iccid: string;
    numero?: string;
    operadora?: string;
    costo_mensual?: number;
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