import { useState } from "react";
import { 
    Banknote, 
    CalendarDays,
    User,
    Car,
    FileText,
    ChevronLeft,
    ChevronRight,
    Tag
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table";
import { Cobro } from "@/types/cobros.types";

interface CobrosTableProps {
    cobros: Cobro[];
}

export function CobrosTable({ cobros }: CobrosTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Paginación Cliente
    const totalPages = Math.ceil(cobros.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentCobros = cobros.slice(startIndex, startIndex + itemsPerPage);

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

    if (cobros.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Banknote className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No se encontraron cobros registrados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    Historial de Pagos
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium">
                    {cobros.length} Transacciones
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Listado de Cobros">
                    <Table.Header>
                        <Table.Head id="date" label="Fecha / Comprobante" />
                        <Table.Head id="client" label="Cliente" className="hidden sm:table-cell" />
                        <Table.Head id="concept" label="Detalle Vehículo / Concepto" className="hidden md:table-cell" />
                        <Table.Head id="amount" label="Valor Pagado" className="text-right pr-6" />
                    </Table.Header>

                    <Table.Body items={currentCobros}>
                        {(cobro: Cobro) => (
                            <Table.Row id={`${cobro.comprobantePago}-${cobro.idInterno}`}>
                                
                                {/* Fecha y Doc */}
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                                            <CalendarDays className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {formatDate(cobro.fechaPago)}
                                            </span>
                                            <span className="text-xs text-slate-500 font-mono" title={cobro.tipoDocumento}>
                                                {cobro.comprobantePago}
                                            </span>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Cliente */}
                                <Table.Cell className="hidden sm:table-cell">
                                    <div className="flex flex-col gap-1 max-w-[200px]">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="truncate" title={cobro.cliente}>{cobro.cliente}</span>
                                        </div>
                                        <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded w-fit border border-slate-200">
                                            ID: {cobro.codigoCliente}
                                        </span>
                                    </div>
                                </Table.Cell>

                                {/* Detalle / Vehículo */}
                                <Table.Cell className="hidden md:table-cell">
                                    <div className="flex flex-col gap-1">
                                        {cobro.vehiculo && cobro.vehiculo !== 'Varios / No aplica' && (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                <Car className="h-3.5 w-3.5 text-blue-500" />
                                                <span className="truncate max-w-[250px]" title={cobro.vehiculo}>
                                                    {cobro.vehiculo}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <FileText className="h-3.5 w-3.5" />
                                            <span className="truncate max-w-[300px]" title={cobro.concepto}>
                                                {cobro.concepto}
                                            </span>
                                        </div>
                                        {cobro.tipoPago && (
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Tag className="h-3 w-3" />
                                                {cobro.tipoPago}
                                            </span>
                                        )}
                                    </div>
                                </Table.Cell>

                                {/* Valor */}
                                <Table.Cell className="text-right">
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="font-bold text-base text-emerald-600 tracking-tight">
                                            + {formatMoney(cobro.valorPagado)}
                                        </span>
                                        {cobro.cuota > 0 && (
                                            <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
                                                Cuota #{cobro.cuota}
                                            </span>
                                        )}
                                    </div>
                                </Table.Cell>

                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>

                {/* Controles de Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-50 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4 text-slate-600" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-50 transition-all"
                            >
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </button>
                        </div>
                    </div>
                )}
            </TableCard.Root>
        </div>
    );
}