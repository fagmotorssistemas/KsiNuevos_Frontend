// src/types/contratos.types.ts

export interface ContratoResumen {
    notaVenta: string;
    fechaVenta: string;
    clienteId: string;
    clienteNombre: string;
    ccoCodigo: string;
    ccoEmpresa: number;
}

export interface ContratoDetalle {
    // --- Identificación ---
    notaVenta: string;
    fechaVenta: string;
    nroContrato: string;
    ccoCodigo: string;
    
    // --- Fechas y Lugares ---
    textoFecha: string;
    textoFechaDado: string;
    textoFechaCr: string;
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
    vehiculo: string;
    marca: string;
    modelo: string;
    tipoVehiculo: string;
    anio: string;            
    anioFabricacion: string; 
    color: string;
    placa: string;
    motor: string;
    chasis: string;
    
    // --- Valores Económicos ---
    precioVehiculo: number;
    precioVehiculoLetras: string;
    gastosAdministrativos: number;
    precioGastos: number;
    
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
    
    // --- Internos (ESTOS FALTABAN Y CAUSABAN EL ERROR) ---
    dfacProducto: number;
    apoderado?: string | null;
}

export interface CuotaAmortizacion {
    nroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: string;
    valorCuota: string;
    saldoCapital: number;
}