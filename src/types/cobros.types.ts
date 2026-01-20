export interface Cobro {
    tipoDocumento: string;
    comprobantePago: string;
    fechaPago: string;
    tipoPago: string;
    codigoCliente: string;
    cliente: string;
    comprobanteDeuda: string;
    factura: string;
    vehiculo: string;
    cuota: number;
    fechaVencimiento: string;
    valorPagado: number;
    concepto: string;
    idInterno: number;
}

export interface ResumenCobros {
    totalRecaudado: number;
    cantidadTransacciones: number;
    totalMesActual: number;
    cobroMasReciente: string;
    distribucionPorTipo: Record<string, number>;
    fechaActualizacion: string;
}

export interface DashboardCobrosResponse {
    resumen: ResumenCobros;
    listado: Cobro[];
}