import {
    Users,
    Briefcase,
    MapPin,
    CalendarDays
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table";
import { Empleado } from "@/types/employees.types";

interface EmployeesTableProps {
    employees: Empleado[];
}

export function EmployeesTable({ employees }: EmployeesTableProps) {

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (employees.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Users className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No se encontraron empleados registrados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Nómina de Personal
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium">
                    {employees.length} Registros
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Listado de Empleados">
                    <Table.Header>
                        <Table.Head id="name" label="Colaborador" />
                        <Table.Head id="role" label="Cargo / Área" className="hidden sm:table-cell" />
                        <Table.Head id="details" label="Detalles" className="hidden md:table-cell" />
                        <Table.Head id="salary" label="Sueldo" className="text-right pr-6" />
                    </Table.Header>

                    <Table.Body items={employees}>
                        {(emp: Empleado) => (
                            <Table.Row id={emp.cedula}>
                                {/* Colaborador */}
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-white shadow-sm shrink-0">
                                            {emp.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 text-sm line-clamp-1" title={emp.nombre}>
                                                {emp.nombre}
                                            </span>
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                C.I. {emp.cedula}
                                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${emp.estado?.toUpperCase() === 'ACTIVO'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-red-50 text-red-700 border-red-100'
                                                    }`}>
                                                    {emp.estado}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Cargo */}
                                <Table.Cell className="hidden sm:table-cell">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                            {emp.cargo}
                                        </div>
                                        <span className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded w-fit border border-slate-200">
                                            {emp.agencia}
                                        </span>
                                    </div>
                                </Table.Cell>

                                {/* Detalles (Ubicación/Fecha) */}
                                <Table.Cell className="hidden md:table-cell">
                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-3 w-3" />
                                            {emp.direccion || 'Sin dirección'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays className="h-3 w-3" />
                                            Ingreso: {formatDate(emp.fechaIngreso)}
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Sueldo */}
                                <Table.Cell className="text-right">
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="font-bold text-base text-slate-900 tracking-tight">
                                            {formatMoney(emp.sueldo)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            Mensual
                                        </span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </TableCard.Root>
        </div>
    );
}