export interface Empleado {
    empresa: string;
    agencia: string;
    nombre: string;
    cargo: string;
    cedula: string;
    genero: string;
    sueldo: number;
    fechaIngreso: string;
    estado: string;
    tipoEstado: string;
    origen: string;
    direccion: string;
    fondoReserva: string;
    cuentaBanco: string;
}

export interface ResumenEmpleados {
    totalEmpleados: number;
    totalNominaMensual: number;
    totalActivos: number;
    fechaActualizacion: string;
}

export interface DashboardEmpleadosResponse {
    resumen: ResumenEmpleados;
    listado: Empleado[];
}