export interface MovimientoFinanciero {
    fecha: string; // Vendra como ISO string del JSON
    concepto: string;
    beneficiario: string;
    documento: string;
    monto: number;
    tipoMovimiento: 'INGRESO' | 'EGRESO';
}

export interface ResumenFinanciero {
    totalIngresos: number;
    totalEgresos: number;
    balanceNeto: number;
    cantidadMovimientos: number;
    fechaActualizacion: string;
}

export interface DashboardFinanzasResponse {
    resumen: ResumenFinanciero;
    ultimosMovimientos: MovimientoFinanciero[];
}