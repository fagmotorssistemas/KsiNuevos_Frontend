export interface ClientePB {
    id: string;
    created_at: string;
    nombre_completo: string;
    identificacion: string | null;
    telefono: string | null;
    direccion: string | null;
    email: string | null;
    calificacion_cliente: string | null;
    observaciones_legales: string | null;
    color_etiqueta: string | null;
}

export interface ContratoPB {
    id: string;
    cliente_id: string;
    numero_contrato: string | null;
    alias_vehiculo: string | null;
    placa: string | null;
    chasis: string | null;
    marca: string | null;
    estado: string; // 'ACTIVO', 'FINALIZADO', 'LEGAL'
    tasa_mora_diaria: number;
    saldo_inicial_total: number;
    notas_internas: string | null;
}

export interface CuotaPB {
    id: string;
    contrato_id: string;
    indice_ordenamiento: number;

    // Datos Editables
    numero_cuota_texto: string | null;
    concepto: string | null;

    // Fechas
    fecha_vencimiento: string | null; // string ISO fecha
    fecha_pago_realizado: string | null;

    // Valores
    valor_capital: number;
    valor_interes: number;
    valor_cuota_total: number;

    // Mora
    dias_mora_calculados: number;
    valor_mora_sugerido: number;
    valor_mora_cobrado: number;

    // Saldos
    valor_pagado: number;
    saldo_pendiente: number;

    // Estado Visual
    estado_pago: string; // 'PENDIENTE', 'PAGADO', 'PARCIAL'
    color_fila: string | null;
    observaciones: string | null;
    es_adicional: boolean;
}

// Un contrato que ya incluye sus cuotas dentro (para facilitar el frontend)
export interface ContratoCompleto extends ContratoPB {
    cuotas: CuotaPB[];
}