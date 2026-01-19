import { useState } from "react";
import { 
    FileText, 
    CalendarDays,
    ArrowUpCircle,
    ArrowDownCircle,
    User,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table";
import { MovimientoFinanciero } from "@/types/finanzas.types";

interface FinanzasTableProps {
    movimientos: MovimientoFinanciero[];
}

export function FinanzasTable({ movimientos }: FinanzasTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Lógica de paginación simple cliente
    const totalPages = Math.ceil(movimientos.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentMovimientos = movimientos.slice(startIndex, startIndex + itemsPerPage);

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

    if (movimientos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay movimientos financieros registrados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Historial de Transacciones
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium">
                    {movimientos.length} Registros
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Listado de Movimientos">
                    <Table.Header>
                        <Table.Head id="date" label="Fecha / Documento" />
                        <Table.Head id="concept" label="Concepto" className="hidden sm:table-cell" />
                        <Table.Head id="beneficiary" label="Beneficiario" className="hidden md:table-cell" />
                        <Table.Head id="amount" label="Monto" className="text-right pr-6" />
                    </Table.Header>

                    <Table.Body items={currentMovimientos}>
                        {(mov: MovimientoFinanciero) => {
                            const isIngreso = mov.tipoMovimiento === 'INGRESO';
                            return (
                                <Table.Row id={`${mov.documento}-${mov.fecha}`}>
                                    
                                    {/* Fecha y Documento */}
                                    <Table.Cell>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                                isIngreso ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                                {isIngreso ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                                    {formatDate(mov.fecha)}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    Doc: {mov.documento}
                                                </span>
                                            </div>
                                        </div>
                                    </Table.Cell>

                                    {/* Concepto */}
                                    <Table.Cell className="hidden sm:table-cell">
                                        <p className="text-sm text-slate-600 line-clamp-2 max-w-[300px]" title={mov.concepto}>
                                            {mov.concepto}
                                        </p>
                                    </Table.Cell>

                                    {/* Beneficiario */}
                                    <Table.Cell className="hidden md:table-cell">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="font-medium text-slate-700 truncate max-w-[200px]">
                                                {mov.beneficiario}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    {/* Monto */}
                                    <Table.Cell className="text-right">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={`font-bold text-sm tracking-tight ${
                                                isIngreso ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                                {isIngreso ? '+' : '-'}{formatMoney(mov.monto)}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase">
                                                {mov.tipoMovimiento}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                </Table.Row>
                            );
                        }}
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