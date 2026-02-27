// --- INTERFACES PRINCIPALES DE CARTERA ---

export interface KpiCartera {
    totalCartera: number;
    carteraVencida: number;
    carteraVigente: number;
    porcentajeMorosidad: number;
    cantidadClientesConDeuda: number;
}

export interface ClienteDeudaSummary {
    clienteId: number;       
    nombre: string;          
    identificacion: string;  
    totalDeuda: number;      
    documentosVencidos: number; 
    diasMoraMaximo: number;  
    telefonos: {
        principal: string | null;
        secundario: string | null;
        celular: string | null;
    };
    categoria: string;
    zonaCobranza: string;
}

export interface DetalleDocumento {
    tipoDocumento: string;   
    numeroDocumento: string; 
    numeroFisico: string;
    numeroCuota: number;
    totalCuotas?: number;
    fechaEmision: string;      
    fechaVencimiento: string;  
    diasMora: number;
    estadoVencimiento: string;
    valorOriginal: number;   
    saldoPendiente: number;  
    tienda: string;          
    observacionDoc: string;
    categoriaCliente: string;
    cobrador: string;
    
    // Campos opcionales que pueden venir en el documento para facilitar visualización
    nombreCliente?: string;
    identificacion?: string;
    telefono1?: string;
    telefono2?: string;
    telefono3?: string;
}

export interface NotaGestion {
    fecha: string;
    usuario: string;         
    observacion: string;     
    fechaProximaLlamada?: string; 
}

export interface HistorialVenta {
    fecha: string;
    documento: string;
    producto: string;
    referencia: string;
    valorTotal: number;
    vendedor: string;
    observaciones: string;
}

export interface HistorialPago {
    fecha: string;
    numeroRecibo: string;   // CCO_NUMERO o CCO_DOCTRAN
    concepto: string;       // CCO_CONCEPTO
    montoTotal: number;     // DFP_MONTO
    formaPago: string;      // DFP_TIPOPAGO (o traducido)
    referenciaPago: string; // DFP_NRO_DOCUM (Cheque/Depósito)
    usuario: string;        // CREA_USR
}

export interface ClienteBusqueda {
    clienteId: number;
    nombre: string;
    identificacion: string;
    telefono: string | null;
}

// ✅ INTERFAZ ACTUALIZADA (FUSIONADA)
export interface ClienteDetalleResponse {
    // Datos principales del cliente (en la raíz)
    nombre?: string;              // Nombre completo
    nombreCliente?: string;       // Alias por compatibilidad
    identificacion?: string;      // Cédula/RUC
    categoria?: string;           // Categoría
    zonaCobranza?: string;        // Zona
    
    // Teléfonos
    telefono1?: string;           // Principal
    telefono2?: string;           // Secundario  
    telefono3?: string;           // Celular
    
    // Listas de información
    documentos: DetalleDocumento[];
    notas: NotaGestion[];
    ventas?: HistorialVenta[];    // Opcional (?) para evitar errores si viene null
    pagos?: HistorialPago[];      // Opcional (?) para evitar errores si viene null
}

// --- NUEVAS INTERFACES PARA AMORTIZACIÓN (AGREGADAS HOY) ---

export interface CreditoResumen {
    idCredito: string; // El ID largo (ej: "100...592")
    numeroOperacion: number;
    montoOriginal: number;
    fechaInicio?: string;
}

export interface CuotaAmortizacion {
    numeroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: number;
    valorCuota: number;
    saldoPendiente: number;
}