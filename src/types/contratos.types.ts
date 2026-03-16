// src/types/contratos.types.ts

export interface ContratoResumen {
    notaVenta: string;
    fechaVenta: string;
    clienteId: string;
    clienteNombre: string;
    ccoCodigo: string;
    ccoEmpresa: number;
}

// Nueva interfaz para las cuotas extras (tipo pago 10001350)
export interface CuotaAdicional {
    monto: number;
    letras: string;
    /** Fecha de vencimiento DD/MM/YYYY. Puede venir vacía "". */
    fechaVencimiento: string;
    /** Código del comprobante de recibo. Puede venir vacío "". */
    ccoRecibo: string;
}

// Pagos en cheque (tipo pago 10001347)
export interface PagoCheque {
    monto: number;
    letras: string;
    /** Fecha de vencimiento DD/MM/YYYY. Puede venir vacía "". */
    fechaVencimiento: string;
    /** Código del comprobante de recibo. Puede venir vacío "". */
    ccoRecibo: string;
}

export interface ContratoDetalle {
    // --- Identificación ---
    notaVenta: string;
    fechaVenta: string;
    fechaVentaFull?: string;
    nroContrato: string;
    ccoCodigo: string;
    
    // --- Fechas y Lugares ---
    textoFecha: string;       // cco_fecha
    textoFechaDado: string;   // cco_fecha_dado
    textoFechaCr: string;     // cco_fechacr
    fechaCiudad: string;      // cco_fecha_ci
    fechaCorta: string;       // cco_fecha1
    ciudadContrato: string; 
    ciudadCliente: string;
    
    // --- Cliente ---
    cliente: string;
    facturaNombre: string;
    facturaRuc: string;
    facturaDireccion: string;
    facturaTelefono: string;
    
    // --- Vehículo ---
    sistemaNombre: string;
    vehiculo: string;         // El vehículo que se vende
    vehiculoUsadoTexto: string; // Texto original del vehículo recibido (vehiculo_usado)
    marca: string;
    modelo: string;
    tipoVehiculo: string;
    anio: string;            
    anioFabricacion: string; 
    color: string;
    placa: string;
    motor: string;
    chasis: string;
    datosVehiculo: string;    // Bloque de texto con datos (datos_vehiculo)
    
    // --- Valores Económicos ---
    precioVehiculo: number;
    precioVehiculoLetras: string;     // dfac_precio_letras
    precioVehiculoMasLetras: string;  // dfac_precio_mas_letras
    gastosAdministrativos: number;
    precioGastos: number;
    precioGastosLetras: string;       // precio_gastos_letras
    
    // --- Totales ---
    totalFinal: string;
    totalLetras: string;
    totalPagareLetras: string;
    
    // --- Forma de Pago ---
    formaPago: string;
    observaciones: string;
    
    // --- Extras ---
    seguroRastreo: string;
    totalSeguro: string;
    totalRastreador: string;
    vendedor: string;
    
    // --- Internos ---
    dfacProducto: number;
    apoderado?: string | null;

    // --- NUEVOS CAMPOS DE PAGOS Y RECEPCIONES ---
    montoVehiculoUsado: number;
    letrasVehiculoUsado: string;
    montoCuotaAdicional: number; 
    letrasCuotaAdicional: string;
    // SE AGREGA LA LISTA QUE VIENE DEL BACKEND
    listaCuotasAdicionales: CuotaAdicional[];
    listaPagosCheque: PagoCheque[];
}

export interface CuotaAmortizacion {
    nroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: string;
    valorCuota: string;
    saldoCapital: number;
}