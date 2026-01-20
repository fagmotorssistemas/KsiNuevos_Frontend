import { 
    Clock, 
    Car,
    CreditCard,
    Pencil,
    User
} from "lucide-react";

import { Table, TableCard } from "@/components/ui/table";
import { BadgeWithIcon } from "@/components/ui/badges";
import { Button } from "@/components/ui/buttontable";

// Importamos los tipos y helpers que ya definiste en la Card para no duplicar lógica
import { ShowroomVisit, getSourceLabel, getCreditLabel } from "./ShowroomCard";

interface ShowroomTableProps {
    visits: ShowroomVisit[];
    onEdit: (visit: ShowroomVisit) => void;
}

export function ShowroomTable({ visits, onEdit }: ShowroomTableProps) {

    // Helper para formatear horas en la tabla
    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        
        // CORRECCIÓN: Eliminamos timeZone: 'UTC'.
        // Ahora el navegador tomará la hora UTC de la base de datos (ej: 22:00)
        // y la convertirá automáticamente a tu hora local (17:00).
        return new Intl.DateTimeFormat('es-ES', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true
            // timeZone: 'UTC' <--- ELIMINADO
        }).format(new Date(dateStr));
    };

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return 'En curso';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return `${Math.round(diff / 60000)} min`;
    };

    if (visits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <User className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay visitas para mostrar en la tabla.</p>
            </div>
        );
    }

    return (
        <TableCard.Root>
            <Table aria-label="Tabla de Visitas Showroom">
                <Table.Header>
                    <Table.Head id="client" label="Cliente" />
                    <Table.Head id="schedule" label="Horario / Duración" />
                    <Table.Head id="vehicle" label="Interés" className="hidden md:table-cell" />
                    <Table.Head id="source" label="Origen" />
                    <Table.Head id="status" label="Crédito" />
                    <Table.Head id="actions" label="" />
                </Table.Header>

                <Table.Body items={visits}>
                    {(visit: ShowroomVisit) => {
                        const sourceInfo = getSourceLabel(visit.source);
                        const creditInfo = getCreditLabel(visit.credit_status);
                        
                        return (
                            <Table.Row id={visit.id}>
                                {/* Columna Cliente */}
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                            {visit.client_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 line-clamp-1" title={visit.client_name}>
                                                {visit.client_name}
                                            </span>
                                            {visit.profiles && (
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {visit.profiles.full_name.split(' ')[0]} (Asesor)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Columna Horario */}
                                <Table.Cell>
                                    <div className="flex flex-col text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                            {formatTime(visit.visit_start)} 
                                            <span className="text-slate-300">-</span> 
                                            {visit.visit_end ? formatTime(visit.visit_end) : '...'}
                                        </div>
                                        <span className={`text-xs ${!visit.visit_end ? 'text-green-600 font-medium animate-pulse' : 'text-slate-400'}`}>
                                            {formatDuration(visit.visit_start, visit.visit_end)}
                                        </span>
                                    </div>
                                </Table.Cell>

                                {/* Columna Vehículo */}
                                <Table.Cell className="hidden md:table-cell">
                                    {visit.inventory ? (
                                        <div className="flex items-center gap-2">
                                            <Car className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm text-slate-700">
                                                <span className="font-semibold">{visit.inventory.brand}</span> {visit.inventory.model} <span className="text-slate-400 text-xs">'{visit.inventory.year}</span>
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic pl-6">No especificado</span>
                                    )}
                                    {visit.test_drive && (
                                        <span className="ml-6 mt-1 inline-block text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                            Test Drive
                                        </span>
                                    )}
                                </Table.Cell>

                                {/* Columna Origen */}
                                <Table.Cell>
                                    <BadgeWithIcon
                                        color={sourceInfo.label === 'Facebook' ? 'brand' : sourceInfo.label === 'Referido' ? 'success' : 'gray'}
                                        className={`capitalize ${sourceInfo.color} bg-opacity-20`}
                                        // Usamos un div vacío como icono si no queremos uno específico, o pasamos null si el componente lo permite
                                        iconLeading={undefined} 
                                    >
                                        {sourceInfo.label}
                                    </BadgeWithIcon>
                                </Table.Cell>

                                {/* Columna Crédito */}
                                <Table.Cell>
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${creditInfo.color}`}>
                                        <CreditCard className="h-3 w-3" />
                                        {creditInfo.label}
                                    </div>
                                </Table.Cell>

                                {/* Acciones */}
                                <Table.Cell>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="link-gray"
                                            size="sm"
                                            onClick={() => onEdit(visit)}
                                            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                            title="Editar visita"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        );
                    }}
                </Table.Body>
            </Table>
        </TableCard.Root>
    );
}