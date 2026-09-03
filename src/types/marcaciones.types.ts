export type MarcacionEstado = "de_mas" | "de_menos" | "justo" | "falta" | "no_laboral";

export interface MarcacionPunto {
    hora: string;
    metodo: string;
    fechaHora?: string;
}

export interface MarcacionDia {
    fecha: string;
    total?: number;
    marcaciones?: MarcacionPunto[];
    entrada?: string | null;
    salida?: string | null;
    almuerzoIda?: string | null;
    almuerzoVuelta?: string | null;
    horasHechas?: number | null;
    horasLegales?: number | null;
    diferencia?: number | null;
    extras?: number | null;
    deMenos?: number | null;
    estado?: MarcacionEstado | string | null;
    alertas?: string[];
}

export interface MarcacionUsuarioTotales {
    horasHechas?: number;
    horasLegales?: number;
    diferencia?: number;
}

export interface MarcacionUsuario {
    employeeNo: string;
    nombre: string;
    totalMarcaciones: number;
    dias: MarcacionDia[];
    totales?: MarcacionUsuarioTotales;
}

export interface ResumenMarcaciones {
    totalUsuarios: number;
    usuariosConMarcaciones: number;
    totalMarcaciones: number;
    desde: string;
    hasta: string;
    fuente?: string;
    ultimaSync?: string | null;
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

export interface MarcacionMesTotales {
    hechas: number;
    legales: number;
    diferencia: number;
    extras: number;
    deMenos: number;
}

export interface MarcacionMesEmpleado {
    empleado: string;
    employeeNo: string;
    dias: MarcacionDia[];
    totales: MarcacionMesTotales;
}

export interface MarcacionesMesData {
    mes: string;
    cerrado: boolean;
    empleados: MarcacionMesEmpleado[];
}

export interface MarcacionesMesResponse {
    success: boolean;
    message?: string;
    data: MarcacionesMesData;
}
