"use client";

import { useMemo, useState, useEffect } from "react";
// CAMBIO: Usamos el cliente estándar de Supabase para evitar conflictos de versiones
import { createClient } from "@supabase/supabase-js";
import {
    Check,
    X,
    HelpCircle,
    Clock,
    AlertCircle,
    Thermometer,
    Phone,
    Calendar
} from "lucide-react";

import { PaginationPageMinimalCenter } from "@/components/ui/pagination";
import { Table, TableCard } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { BadgeWithIcon } from "@/components/ui/badges";
import { Button } from "@/components/ui/buttontable";

// Importamos tus tipos generados
import type { Database } from "@/types/supabase";

// Definimos el cliente de Supabase manualmente
// Esto evita el error de "has no exported member"
const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Lead = Database['public']['Tables']['leads']['Row'];

type SortDescriptor = {
    column: string;
    direction: "ascending" | "descending";
};

export default function LeadsPage() {
    // Ya no necesitamos hooks especiales, usamos la instancia global 'supabase'

    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "created_at",
        direction: "descending",
    });

    useEffect(() => {
        const fetchLeads = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error cargando leads:", error);
            } else {
                setLeads(data || []);
            }
            setIsLoading(false);
        };

        fetchLeads();
    }, []); // Array de dependencias vacío porque 'supabase' es constante externa

    const sortedItems = useMemo(() => {
        return [...leads].sort((a, b) => {
            const col = sortDescriptor.column as keyof Lead;
            const first = a[col];
            const second = b[col];

            if (first === null || first === undefined) return 1;
            if (second === null || second === undefined) return -1;

            if (typeof first === "boolean" && typeof second === "boolean") {
                const aNum = Number(first);
                const bNum = Number(second);
                return sortDescriptor.direction === "descending" ? bNum - aNum : aNum - bNum;
            }

            if (typeof first === "number" && typeof second === "number") {
                return sortDescriptor.direction === "descending" ? second - first : first - second;
            }

            if (typeof first === "string" && typeof second === "string") {
                let cmp = first.localeCompare(second);
                if (sortDescriptor.direction === "descending") {
                    cmp *= -1;
                }
                return cmp;
            }

            return 0;
        });
    }, [sortDescriptor, leads]);

    // Helpers
    const getInitials = (name: string | null) => {
        return name
            ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
            : "??";
    };

    const formatCurrency = (amount: number | null) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const getStatusConfig = (status: string | null) => {
        switch (status) {
            case 'vendido': return { color: 'success' as const, icon: Check };
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
            case 'frio': return 'gray';
            default: return 'gray';
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestión de prospectos sincronizados desde Kommo.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" size="sm">Exportar</Button>
                    <Button variant="primary" size="sm">Sincronizar</Button>
                </div>
            </div>

            <TableCard.Root>
                <Table
                    aria-label="Tabla de Leads"
                    sortDescriptor={sortDescriptor}
                    onSortChange={setSortDescriptor}
                >
                    <Table.Header>
                        <Table.Head id="lead_id_kommo" label="ID" allowsSorting />
                        <Table.Head id="created_at" label="Fecha" allowsSorting />
                        <Table.Head id="name" label="Cliente" allowsSorting />
                        <Table.Head id="status" label="Estado" allowsSorting />
                        <Table.Head id="temperature" label="Temp" allowsSorting />
                        <Table.Head id="budget" label="Presupuesto" allowsSorting className="hidden md:table-cell" />
                        <Table.Head id="actions" label="" />
                    </Table.Header>

                    <Table.Body items={sortedItems}>
                        {(item: Lead) => {
                            const statusConfig = getStatusConfig(item.status);

                            return (
                                <Table.Row id={item.id}>
                                    <Table.Cell className="font-medium text-slate-900">
                                        #{item.lead_id_kommo}
                                    </Table.Cell>

                                    <Table.Cell className="text-slate-500 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div className="flex items-center gap-3">
                                            <Avatar initials={getInitials(item.name)} alt={item.name || 'Lead'} size="md" />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{item.name}</span>
                                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                    <Phone className="h-3 w-3" />
                                                    {item.phone}
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
                                            {item.status || 'Desconocido'}
                                        </BadgeWithIcon>
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

                                    <Table.Cell className="hidden md:table-cell">
                                        <span className="text-slate-700 font-medium">
                                            {formatCurrency(item.budget)}
                                        </span>
                                        {item.financing && (
                                            <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                Finan.
                                            </span>
                                        )}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="link-gray" size="sm">Editar</Button>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        }}
                    </Table.Body>
                </Table>

                <PaginationPageMinimalCenter page={1} total={leads.length} className="px-6 py-4" />
            </TableCard.Root>
        </div>
    );
}