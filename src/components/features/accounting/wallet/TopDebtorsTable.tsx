import { 
    User, 
    Phone, 
    FileWarning, 
    ArrowRight,
    Ban
} from "lucide-react";

// Componentes UI de tu Design System
import { Table, TableCard } from "@/components/ui/table"; 
import { Button } from "@/components/ui/buttontable"; 
import { BadgeWithIcon } from "@/components/ui/badges";

import { ClienteDeudaSummary } from "@/types/wallet.types";

interface TopDebtorsTableProps {
    debtors: ClienteDeudaSummary[];
    onViewDetail: (clienteId: number) => void;
}

export function TopDebtorsTable({ debtors, onViewDetail }: TopDebtorsTableProps) {

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (debtors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <User className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay deudores para mostrar.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-red-600" />
                    Top Morosidad
                </h3>
                <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
                    Prioridad Alta
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Tabla de Top Deudores">
                    <Table.Header>
                        <Table.Head id="client" label="Cliente" />
                        <Table.Head id="debt" label="Deuda Total" />
                        <Table.Head id="docs" label="Docs Vencidos" className="hidden md:table-cell" />
                        <Table.Head id="contact" label="Contacto" className="hidden md:table-cell" />
                        <Table.Head id="actions" label="" />
                    </Table.Header>

                    <Table.Body items={debtors}>
                        {(debtor: ClienteDeudaSummary) => (
                            <Table.Row id={debtor.clienteId}>
                                {/* Columna Cliente */}
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border border-slate-700">
                                            {debtor.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col max-w-[180px] sm:max-w-xs">
                                            <span className="font-semibold text-slate-900 line-clamp-1" title={debtor.nombre}>
                                                {debtor.nombre}
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                ID: {debtor.clienteId}
                                                {debtor.identificacion !== 'S/N' && ` • ${debtor.identificacion}`}
                                            </span>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Columna Deuda (Resaltada en rojo si es alta) */}
                                <Table.Cell>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {formatMoney(debtor.totalDeuda)}
                                    </span>
                                </Table.Cell>

                                {/* Columna Docs Vencidos */}
                                <Table.Cell className="hidden md:table-cell">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`h-2 w-2 rounded-full ${debtor.documentosVencidos > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <span className={`text-sm font-medium ${debtor.documentosVencidos > 5 ? 'text-red-700' : 'text-slate-600'}`}>
                                            {debtor.documentosVencidos} docs.
                                        </span>
                                    </div>
                                </Table.Cell>

                                {/* Columna Contacto */}
                                <Table.Cell className="hidden md:table-cell">
                                    {debtor.telefono ? (
                                        <div className="flex items-center gap-1.5 text-slate-600 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                                            <Phone className="h-3 w-3" />
                                            {debtor.telefono}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic flex items-center gap-1">
                                            <Ban className="h-3 w-3" /> Sin contacto
                                        </span>
                                    )}
                                </Table.Cell>

                                {/* Acciones */}
                                <Table.Cell>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="link-gray" 
                                            size="sm"
                                            onClick={() => onViewDetail(debtor.clienteId)}
                                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 group"
                                            title="Ver expediente"
                                        >
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Button>
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