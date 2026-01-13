export interface SaldoBanco {
    banco: string;
    numeroCuenta: string;
    tipoCuenta: string;
    saldoActual: number;
    moneda: string;
    ultimoMesRegistrado?: string;
}

export interface ResumenTesoreria {
    totalEnBancos: number;
    cantidadCuentasActivas: number;
    fechaActualizacion: string;
}

export interface DetalleTesoreriaResponse {
    resumen: ResumenTesoreria;
    cuentasBancarias: SaldoBanco[];
}