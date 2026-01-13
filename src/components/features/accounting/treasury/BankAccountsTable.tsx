import { 
    Building2, 
    CreditCard, 
    CalendarClock,
    DollarSign,
    MoreHorizontal
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table"; // Usando tus componentes UI existentes
import { SaldoBanco } from "@/types/treasury.types";

interface BankAccountsTableProps {
    accounts: SaldoBanco[];
}

export function BankAccountsTable({ accounts }: BankAccountsTableProps) {
    
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Helper para asignar colores/iconos según el banco (puedes expandirlo)
    const getBankIcon = (bankName: string) => {
        const name = bankName.toLowerCase();
        if (name.includes('pichincha')) return { color: 'bg-yellow-100 text-yellow-700', label: 'BP' };
        if (name.includes('austro')) return { color: 'bg-red-100 text-red-700', label: 'BA' };
        if (name.includes('guayaquil')) return { color: 'bg-pink-100 text-pink-700', label: 'BG' };
        if (name.includes('pacifico')) return { color: 'bg-blue-100 text-blue-700', label: 'BP' };
        if (name.includes('produbanco')) return { color: 'bg-emerald-100 text-emerald-700', label: 'PR' };
        if (name.includes('internacional')) return { color: 'bg-orange-100 text-orange-700', label: 'BI' };
        return { color: 'bg-slate-100 text-slate-700', label: 'BK' };
    };

    if (accounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Building2 className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No se encontraron cuentas bancarias con saldo.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Detalle de Cuentas Bancarias
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium">
                    {accounts.length} Cuentas
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Listado de Bancos">
                    <Table.Header>
                        <Table.Head id="bank" label="Institución Financiera" />
                        <Table.Head id="account" label="Cuenta / Tipo" className="hidden sm:table-cell" />
                        <Table.Head id="period" label="Último Mov." className="hidden md:table-cell" />
                        <Table.Head id="balance" label="Saldo Disponible" className="text-right pr-6" />
                    </Table.Header>

                    <Table.Body items={accounts}>
                        {(account: SaldoBanco) => {
                            const iconStyle = getBankIcon(account.banco);
                            return (
                                <Table.Row id={account.numeroCuenta}>
                                    {/* Banco */}
                                    <Table.Cell>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl ${iconStyle.color} flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border border-white`}>
                                                {iconStyle.label}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 text-sm">
                                                    {account.banco}
                                                </span>
                                                <span className="text-xs text-slate-500 sm:hidden">
                                                    {account.tipoCuenta} • {account.numeroCuenta}
                                                </span>
                                            </div>
                                        </div>
                                    </Table.Cell>

                                    {/* Cuenta (Desktop) */}
                                    <Table.Cell className="hidden sm:table-cell">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-sm font-mono text-slate-700">
                                                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                                {account.numeroCuenta}
                                            </div>
                                            <span className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded w-fit border border-slate-200">
                                                {account.tipoCuenta === 'CTE' ? 'Cuenta Corriente' : 'Cuenta de Ahorros'}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    {/* Periodo */}
                                    <Table.Cell className="hidden md:table-cell">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            {account.ultimoMesRegistrado || 'Actual'}
                                        </div>
                                    </Table.Cell>

                                    {/* Saldo */}
                                    <Table.Cell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className={`font-bold text-base tracking-tight ${account.saldoActual < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                                {formatMoney(account.saldoActual)}
                                            </span>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        }}
                    </Table.Body>
                </Table>
            </TableCard.Root>
        </div>
    );
}