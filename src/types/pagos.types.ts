export interface PagoProveedor {
    fecha: string;
    agencia: string;
    proveedorId: string;
    proveedor: string;
    concepto: string;
    transaccion: string;
    documentoTransaccion: string;
    monto: number;
    fechaEmision: string;
    fechaVencimiento: string;
    comprobante: string;
    estado: number;
    cuentaContable: string;
    ccoCodigo: string;
}

export interface ResumenPagos {
    totalPagado: number;
    cantidadTransacciones: number;
    proveedorMasFrecuente: string;
    totalPorVencer: number;
    fechaActualizacion: string;
}

export interface DashboardPagosResponse {
    resumen: ResumenPagos;
    listado: PagoProveedor[];
}