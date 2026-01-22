import { useState } from "react";
import { 
    Calendar, 
    FileText, 
    User, 
    CreditCard,
    ChevronLeft,
    ChevronRight,
    Building
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table";
import { PagoProveedor } from "@/types/pagos.types";

interface PagosTableProps {
    pagos: PagoProveedor[];
}

export function PagosTable({ pagos }: PagosTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const totalPages = Math.ceil(pagos.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPagos = pagos.slice(startIndex, startIndex + itemsPerPage);

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

    // Helper para verificar si está vencido
    const isOverdue = (dateString: string) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    if (pagos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CreditCard className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No se encontraron registros de pagos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    Historial de Pagos a Proveedores
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium">
                    {pagos.length} Registros
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Listado de Pagos">
                    <Table.Header>
                        <Table.Head id="date" label="Fecha / Comprobante" />
                        <Table.Head id="provider" label="Proveedor" className="hidden sm:table-cell" />
                        <Table.Head id="concept" label="Concepto / Cuenta" className="hidden md:table-cell" />
                        <Table.Head id="amount" label="Monto" className="text-right pr-6" />
                    </Table.Header>

                    <Table.Body items={currentPagos}>
                        {(pago: PagoProveedor) => (
                            <Table.Row id={`${pago.comprobante}-${pago.ccoCodigo}`}>
                                
                                {/* Fecha y Comprobante */}
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {formatDate(pago.fecha)}
                                            </span>
                                            <span className="text-xs text-slate-500 font-mono" title={pago.transaccion}>
                                                {pago.comprobante}
                                            </span>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Proveedor */}
                                <Table.Cell className="hidden sm:table-cell">
                                    <div className="flex flex-col gap-1 max-w-[250px]">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="truncate" title={pago.proveedor}>{pago.proveedor}</span>
                                        </div>
                                        <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded w-fit border border-slate-200">
                                            ID: {pago.proveedorId}
                                        </span>
                                    </div>
                                </Table.Cell>

                                {/* Concepto */}
                                <Table.Cell className="hidden md:table-cell">
                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <FileText className="h-3 w-3" />
                                            <span className="truncate max-w-[300px]" title={pago.concepto}>
                                                {pago.concepto}
                                            </span>
                                        </div>
                                        {pago.fechaVencimiento && (
                                            <span className={`text-[10px] font-medium px-1.5 rounded w-fit ${
                                                isOverdue(pago.fechaVencimiento) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                            }`}>
                                                Vence: {formatDate(pago.fechaVencimiento)}
                                            </span>
                                        )}
                                    </div>
                                </Table.Cell>

                                {/* Monto */}
                                <Table.Cell className="text-right">
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="font-bold text-base text-slate-900 tracking-tight">
                                            {formatMoney(pago.monto)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {pago.documentoTransaccion || 'S/N'}
                                        </span>
                                    </div>
                                </Table.Cell>

                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>

                {/* Paginación */}
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