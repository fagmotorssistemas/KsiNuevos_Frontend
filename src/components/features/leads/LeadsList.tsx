import {
    Check,
    X,
    HelpCircle,
    Clock,
    AlertCircle,
    Thermometer,
    Phone,
    MessageCircle,
    User
} from "lucide-react";

import { PaginationPageMinimalCenter } from "@/components/ui/pagination";
import { Table, TableCard } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { BadgeWithIcon } from "@/components/ui/badges";
import { Button } from "@/components/ui/buttontable";

import type { LeadWithDetails, SortDescriptor } from "@/hooks/useLeads";

interface LeadsListProps {
    leads: LeadWithDetails[];
    sortDescriptor: SortDescriptor;
    onSortChange: (descriptor: SortDescriptor) => void;
    onLeadSelect: (lead: LeadWithDetails) => void;
    isLoading?: boolean;
    // Props de Paginación Nuevas
    page: number;
    totalCount: number;
    rowsPerPage: number;
    onPageChange: (newPage: number) => void;
}

export function LeadsList({ 
    leads, 
    sortDescriptor, 
    onSortChange, 
    onLeadSelect,
    isLoading = false,
    page,
    totalCount,
    rowsPerPage,
    onPageChange
}: LeadsListProps) {

    // --- Helpers Visuales ---
    const getInitials = (name: string | null) => 
        name ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() : "??";

    const getStatusConfig = (status: string | null) => {
        switch (status) {
            case 'vendido': case 'ganado': return { color: 'success' as const, icon: Check };
            case 'perdido': return { color: 'error' as const, icon: X };
            case 'nuevo': return { color: 'brand' as const, icon: AlertCircle };
            case 'negociando': return { color: 'warning' as const, icon: Clock };
            case 'interesado': return { color: 'primary' as const, icon: HelpCircle };
            case 'contactado': return { color: 'primary' as const, icon: Phone };
            default: return { color: 'gray' as const, icon: HelpCircle };
        }
    };

    const getTempColor = (temp: string | null) => {
        switch (temp) {
            case 'caliente': return 'error';
            case 'tibio': return 'warning';
            default: return 'gray';
        }
    };

    if (isLoading) {
        return <div className="p-10 text-center text-slate-400">Cargando leads...</div>;
    }

    if (leads.length === 0 && totalCount === 0) {
        return (
            <TableCard.Root>
                <div className="p-10 text-center text-slate-500">
                    No se encontraron leads con los filtros actuales.
                </div>
            </TableCard.Root>
        );
    }

    return (
        <TableCard.Root>
            <Table
                aria-label="Tabla de Leads"
                sortDescriptor={sortDescriptor}
                onSortChange={(desc: SortDescriptor) => onSortChange(desc as SortDescriptor)}
            >
                <Table.Header>
                    <Table.Head id="lead_id_kommo" label="ID" allowsSorting />
                    <Table.Head id="name" label="Cliente" allowsSorting />
                    <Table.Head id="status" label="Estado" allowsSorting />
                    <Table.Head id="vehicle" label="Interés" />
                    <Table.Head id="resume" label="Resumen" className="hidden md:table-cell" />
                    <Table.Head id="temperature" label="Temperatura" allowsSorting />
                    <Table.Head id="actions" label="" />
                </Table.Header>

                <Table.Body items={leads}>
                    {(item: LeadWithDetails) => {
                        const statusConfig = getStatusConfig(item.status);
                        const primaryCar = item.interested_cars?.[0];

                        return (
                            <Table.Row id={item.id}>
                                <Table.Cell className="font-medium text-slate-500 text-xs">
                                    {item.lead_id_kommo || `#${item.id}`}
                                </Table.Cell>

                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <Avatar initials={getInitials(item.name)} alt={item.name || 'Lead'} size="md" />
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{item.name}</span>
                                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                {item.source === 'whatsapp' ? <MessageCircle className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                <span className="capitalize">{item.source || 'Desconocido'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Table.Cell>

                                <Table.Cell>
                                    <BadgeWithIcon
                                        color={statusConfig.color}
                                        iconLeading={statusConfig.icon}
                                        className="capitalize"
                                    >
                                        {item.status || 'Nuevo'}
                                    </BadgeWithIcon>
                                </Table.Cell>

                                <Table.Cell>
                                    {primaryCar ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800">
                                                {primaryCar.brand} {primaryCar.model}
                                            </span>
                                            <span className="text-xs text-slate-500">{primaryCar.year}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Sin auto definido</span>
                                    )}
                                </Table.Cell>

                                <Table.Cell className="hidden md:table-cell max-w-xs">
                                    <p className="truncate text-sm text-slate-600" title={item.resume || ''}>
                                        {item.resume || <span className="text-slate-400 italic">Sin resumen ...</span>}
                                    </p>
                                </Table.Cell>

                                <Table.Cell>
                                    <BadgeWithIcon
                                        color={getTempColor(item.temperature) as any}
                                        iconLeading={Thermometer}
                                        className="capitalize"
                                    >
                                        {item.temperature || '-'}
                                    </BadgeWithIcon>
                                </Table.Cell>

                                <Table.Cell>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => onLeadSelect(item)}
                                        >
                                            Gestionar
                                        </Button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        );
                    }}
                </Table.Body>
            </Table>
            
            {/* Paginación Conectada Dinámicamente */}
            <PaginationPageMinimalCenter 
                page={page} 
                total={totalCount} 
                limit={rowsPerPage}
                onChange={onPageChange}
                className="px-6 py-4" 
            />
        </TableCard.Root>
    );
}