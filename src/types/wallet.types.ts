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
    // Campos opcionales que pueden venir en el documento
    nombreCliente?: string;
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

// ✅ INTERFAZ ACTUALIZADA CON DATOS DEL CLIENTE
export interface ClienteDetalleResponse {
    // Datos principales del cliente (deben venir en la raíz de la respuesta)
    nombre?: string;              // Nombre completo del cliente
    nombreCliente?: string;       // Alternativa (por si el backend usa este campo)
    identificacion?: string;      // Cédula/RUC
    categoria?: string;           // Categoría del cliente
    zonaCobranza?: string;        // Zona de cobranza
    
    // Teléfonos del cliente
    telefono1?: string;           // Teléfono principal
    telefono2?: string;           // Teléfono secundario  
    telefono3?: string;           // Celular
    
    // Listas de información del cliente
    documentos: DetalleDocumento[];
    notas: NotaGestion[];
    ventas?: HistorialVenta[];    // Opcional porque puede no tener ventas
    pagos?: HistorialPago[];      // Opcional porque puede no tener pagos
}