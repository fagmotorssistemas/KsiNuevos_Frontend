export interface VehiculoInventario {
    // IDs (Ocultos en UI generalmente)
    codEmpresa: number;
    empresa: string;
    proCodigo: number;
    proId: string;

    // Datos Principales
    marca: string;
    modelo: string;
    anioModelo: string;
    descripcion: string;
    placa: string;
    tipo: string;
    color: string;
    price?: number; 
    mileage?: number;
    
    // Ficha Técnica
    motor: string;
    chasis: string;
    cilindraje: string;
    combustible: string;
    tonelaje: string;
    capacidad: string;
    nroLlantas: string;
    nroEjes: string;
    paisOrigen: string;
    subclase: string;
    ram: string;
    version: string;
    
    // Matriculación
    anioMatricula: string;
    nombreMatricula: string;
    lugarMatricula: string;
    placaCaracteristica: string;
    marcaCaracteristica: string;

    // Compra
    proveedor: string;
    fechaCompra: string;
    formaPago: string;

    // Estado
    stock: number;
}

export interface ResumenInventario {
    totalVehiculosRegistrados: number;
    totalActivos: number;
    totalBaja: number;
    fechaActualizacion: string;
}

export interface DashboardInventarioResponse {
    resumen: ResumenInventario;
    listado: VehiculoInventario[];
}

// --- NUEVOS TIPOS PARA EL HISTORIAL (KARDEX) ---

export interface MovimientoKardex {
    fecha: string;          
    tipoTransaccion: string; // Ej: "NOTA DE ENTREGA", "OBLIGACION DE PRODUCTOS"
    concepto: string;       
    documento: string;      
    clienteProveedor: string; 
    esIngreso: boolean;     
    cantidad: number;       
    costoUnitario: number;  
    total: number;          
    usuario: string;        
}

export interface DetalleVehiculoResponse {
    fichaTecnica: VehiculoInventario | null;
    resumenFinanciero: any; // Lo ignoramos en el frontend por ahora si no se usa
    historialMovimientos: MovimientoKardex[];
}