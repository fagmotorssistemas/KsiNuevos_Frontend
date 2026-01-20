// Estructura detallada del contrato (Consulta 1)
export interface ContratoDetalle {
    notaVenta: string;
    fechaVenta: string;
    cliente: string;
    sistemaNombre: string;
    textoFecha: string;
    totalFinal: string;
    totalLetras: string;
    facturaNombre: string;
    facturaRuc: string;
    facturaDireccion: string;
    facturaTelefono: string;
    ubicacion: string;
    nroContrato: string;
    formaPago: string;
    vehiculoUsado: string;
    marca: string;
    tipoVehiculo: string;
    anio: string;
    modelo: string;
    placa: string;
    motor: string;
    chasis: string;
    color: string;
    observaciones: string;
    vendedor: string;
    precioVehiculo: number;
    gastosAdministrativos: string;
    ccoCodigo: string; // El ID Gigante en string
}

// Estructura de la tabla de amortización (Consulta 3)
export interface CuotaAmortizacion {
    nroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: string;
    valorCuota: string;
    saldoCapital: number;
}

export interface DataLoadResponse {
    resumenContratos: any[]; // No lo usaremos mucho si el detalle ya tiene todo
    detallesContratos: ContratoDetalle[];
}