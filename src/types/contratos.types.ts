// Para la tabla principal (Carga rápida)
export interface ContratoResumen {
    notaVenta: string;
    fechaVenta: string;
    clienteId: string;
    clienteNombre: string;
    ccoCodigo: string;
    ccoEmpresa: number;
}

// Para el modal de detalle (Carga completa)
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
    ccoCodigo: string;
}

export interface CuotaAmortizacion {
    nroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: string;
    valorCuota: string;
    saldoCapital: number;
}