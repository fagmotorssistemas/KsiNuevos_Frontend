export interface KpiCartera {
    totalCartera: number;
    carteraVencida: number;
    carteraVigente: number;
    porcentajeMorosidad: number;
    cantidadClientesConDeuda: number;
}

export interface ClienteDeudaSummary {
    clienteId: number;
    nombre: string;
    identificacion: string;
    totalDeuda: number;
    documentosVencidos: number;
    diasMoraMaximo: number;
    telefono: string | null;
    email: string | null;
}

export interface DetalleDocumento {
    tipoDocumento: string;
    numeroDocumento: string;
    fechaEmision: string; // En el JSON viajan como string
    fechaVencimiento: string;
    diasVencidos: number;
    valorOriginal: number;
    saldoPendiente: number;
    agente: string;
    tienda: string;
}

export interface NotaGestion {
    fecha: string;
    usuario: string;
    observacion: string;
    fechaProximaLlamada?: string;
}

export interface ClienteBusqueda {
    clienteId: number;
    nombre: string;
    identificacion: string;
    telefono: string | null;
}

// Una interfaz auxiliar para la respuesta completa del detalle
export interface ClienteDetalleResponse {
    documentos: DetalleDocumento[];
    notas: NotaGestion[];
}