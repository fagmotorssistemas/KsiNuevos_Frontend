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
import type { LeadWithDetails, SortDescriptor } from "@/types/leads.types";

interface LeadsListProps {
    leads: LeadWithDetails[];
    sortDescriptor: SortDescriptor;
    onSortChange: (descriptor: SortDescriptor) => void;
    onLeadSelect: (lead: LeadWithDetails) => void;
    isLoading?: boolean;
    page: number;
    totalCount: number;
    rowsPerPage: number;
    onPageChange: (newPage: number) => void;
    currentUserRole: string | null | undefined;
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
    onPageChange,
    currentUserRole
}: LeadsListProps) {

    const isAdmin = currentUserRole === 'admin';

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
            case 'en_proceso': return { color: 'gray' as const, icon: Clock, label: 'En Proceso' };
            case 'datos_pedidos': return { color: 'gray' as const, icon: User, label: 'Datos Pedidos' };
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

    const getFormattedSource = (source: string | null) => {
        if (!source) return 'Desconocido';
        const lowerSource = String(source).toLowerCase();
        if (lowerSource === 'waba') return 'WhatsApp';
        if (lowerSource === 'tiktok_kommo') return 'TikTok';
        if (lowerSource === 'instagram_business') return 'Instagram';
        return source;
    };

    const getSourceIcon = (source: string | null) => {
        const lowerSource = String(source || '').toLowerCase();
        if (lowerSource === 'whatsapp' || lowerSource === 'waba') {
            return <MessageCircle className="h-3 w-3" />;
        }
        return <User className="h-3 w-3" />;
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
            {/* ESTRUCTURA SHOWROOM: w-full asegura que ocupe todo el ancho disponible */}
            <Table
                aria-label="Tabla de Leads"
                sortDescriptor={sortDescriptor}
                onSortChange={(desc: SortDescriptor) => onSortChange(desc as SortDescriptor)}
                className="w-full"
            >
                <Table.Header>
                    {/* COLUMNA ID ELIMINADA */}
                    
                    {/* Cliente: No le ponemos ancho fijo para que absorba el espacio disponible */}
                    <Table.Head id="name" label="Cliente" allowsSorting />

                    {isAdmin && (
                        <Table.Head id="assigned_to" label="Responsable" />
                    )}

                    <Table.Head id="status" label="Estado" allowsSorting />
                    
                    {/* Ocultamos Interés en pantallas medianas (md) para ajustar espacio */}
                    <Table.Head id="vehicle" label="Interés" className="hidden md:table-cell" />
                    
                    {/* Resumen oculto en pantallas lg para dar prioridad a columnas vitales */}
                    <Table.Head id="resume" label="Resumen" className="hidden lg:table-cell" />
                    
                    <Table.Head id="temperature" label="Temp" allowsSorting />
                    
                    {/* Columna de acciones */}
                    <Table.Head id="actions" label="" />
                </Table.Header>

                <Table.Body items={leads}>
                    {(item: LeadWithDetails) => {
                        const statusConfig = getStatusConfig(item.status);
                        const primaryCar = item.interested_cars?.[0];
                        const responsableName = item.profiles?.full_name;
                        const lowerSource = String(item.source || '').toLowerCase();
                        const isSpecialSource = ['waba', 'tiktok_kommo', 'instagram_business'].includes(lowerSource);

                        return (
                            <Table.Row id={item.id}>
                                {/* CELDA ID ELIMINADA */}

                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <Avatar initials={getInitials(item.name)} alt={item.name || 'Lead'} size="md" />
                                        <div className="flex flex-col "> {/* min-w-0 ayuda a que el truncate funcione dentro de flex */}
                                            {/* El nombre tomará el espacio disponible */}
                                            <span className="font-medium text-slate-900 line-clamp-1 break-all" title={item.name || ''}>
                                                {item.name}
                                            </span>
                                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                {getSourceIcon(item.source)}
                                                <span className={isSpecialSource ? '' : 'capitalize'}>
                                                    {getFormattedSource(item.source)}
                                                </span>
                                                {/* Opcional: Mostrar ID pequeño aquí si se necesita referencia, descomentar si se desea:
                                                <span className="text-slate-300 mx-1">|</span>
                                                <span className="text-slate-400">#{item.lead_id_kommo || item.id}</span> 
                                                */}
                                            </div>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {isAdmin && (
                                    <Table.Cell>
                                        {responsableName ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0">
                                                    {getInitials(responsableName)}
                                                </div>
                                                <span className="text-sm text-slate-700 capitalize truncate max-w-[80px]">
                                                    {responsableName}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Sin asignar
                                            </span>
                                        )}
                                    </Table.Cell>
                                )}

                                <Table.Cell>
                                    <BadgeWithIcon
                                        color={statusConfig.color}
                                        iconLeading={statusConfig.icon}
                                        className="capitalize whitespace-nowrap"
                                    >
                                        {item.status || 'Nuevo'}
                                    </BadgeWithIcon>
                                </Table.Cell>

                                <Table.Cell className="hidden md:table-cell max-w-[180px]">
                                    {primaryCar ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800 truncate" title={`${primaryCar.brand} ${primaryCar.model}`}>
                                                {primaryCar.brand} {primaryCar.model}
                                            </span>
                                            <span className="text-xs text-slate-500">{primaryCar.year}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Sin auto definido</span>
                                    )}
                                </Table.Cell>

                                <Table.Cell className="hidden lg:table-cell max-w-[80px]">
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