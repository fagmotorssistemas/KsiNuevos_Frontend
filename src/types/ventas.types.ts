export interface VentaVehiculo {
    fecha: string;
    periodo: number;
    mes: number;
    numeroComprobante: string;
    agencia: string;
    rucCedulaCliente: string;
    direccionCliente: string;
    tipoProducto: string;
    ubicacion: string;
    codigoReferencia: string;
    producto: string;
    tipoVehiculo: string;
    marca: string;
    motor: string;
    chasis: string;
    modelo: string;
    anio: string;
    color: string;
    bodega: string;
    cantidad: number;
    agenteAsignado: string;
    agenteVenta: string;
}

export interface ResumenVentas {
    totalUnidadesVendidas: number;
    totalVentasMesActual: number;
    topMarca: string;
    distribucionPorTipo: Record<string, number>;
    fechaActualizacion: string;
}

export interface DashboardVentasResponse {
    resumen: ResumenVentas;
    listado: VentaVehiculo[];
}