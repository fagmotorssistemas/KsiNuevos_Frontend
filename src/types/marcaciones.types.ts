export interface MarcacionPunto {
    hora: string;
    metodo: string;
    fechaHora: string;
}

export interface MarcacionDia {
    fecha: string;
    total: number;
    marcaciones: MarcacionPunto[];
}

export interface MarcacionUsuario {
    employeeNo: string;
    nombre: string;
    totalMarcaciones: number;
    dias: MarcacionDia[];
}

export interface ResumenMarcaciones {
    totalUsuarios: number;
    usuariosConMarcaciones: number;
    totalMarcaciones: number;
    desde: string;
    hasta: string;
}

export interface MarcacionesReporteData {
    resumen: ResumenMarcaciones;
    usuarios: MarcacionUsuario[];
}

export interface MarcacionesReporteResponse {
    success: boolean;
    message?: string;
    data: MarcacionesReporteData;
}

export interface MarcacionesRange {
    desde?: string;
    hasta?: string;
}
