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
    textoFecha: string;       // cco_fecha
    textoFechaDado: string;   // cco_fecha_dado
    textoFechaCr: string;     // cco_fechacr
    fechaCiudad: string;      // NUEVO: cco_fecha_ci
    fechaCorta: string;       // NUEVO: cco_fecha1
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
    vehiculoUsadoTexto: string; // NUEVO: Texto del vehículo que se recibe (vehiculo_usado)
    marca: string;
    modelo: string;
    tipoVehiculo: string;
    anio: string;            
    anioFabricacion: string; 
    color: string;
    placa: string;
    motor: string;
    chasis: string;
    datosVehiculo: string;    // NUEVO: Bloque de texto con datos (datos_vehiculo)
    
    // --- Valores Económicos ---
    precioVehiculo: number;
    precioVehiculoLetras: string;     // dfac_precio_letras
    precioVehiculoMasLetras: string;  // NUEVO: dfac_precio_mas_letras
    gastosAdministrativos: number;
    precioGastos: number;
    precioGastosLetras: string;       // NUEVO: precio_gastos_letras
    
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
}
// ... (El resto de interfaces se mantiene igual)

export interface CuotaAmortizacion {
    nroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: string;
    valorCuota: string;
    saldoCapital: number;
} 