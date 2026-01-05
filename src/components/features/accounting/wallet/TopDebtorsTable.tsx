import { 
    User, 
    FileWarning, 
    ArrowRight,
    Building2,
    MapPin
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table"; 
import { Button } from "@/components/ui/buttontable"; 
import { ClienteDeudaSummary } from "@/types/wallet.types";
import { ClientContactInfo } from "./ClientContactInfo";

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
                    Top Morosidad Crítica
                </h3>
                <span className="text-xs text-slate-500 font-medium bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-100">
                    Requieren Acción Inmediata
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Tabla de Top Deudores">
                    <Table.Header>
                        <Table.Head id="client" label="Cliente / ID" />
                        <Table.Head id="category" label="Categoría / Zona" className="hidden lg:table-cell" />
                        <Table.Head id="debt" label="Deuda Total" />
                        <Table.Head id="status" label="Situación" className="hidden md:table-cell" />
                        <Table.Head id="contact" label="Contacto Directo" className="hidden sm:table-cell" />
                        <Table.Head id="actions" label="" />
                    </Table.Header>

                    <Table.Body items={debtors}>
                        {(debtor: ClienteDeudaSummary) => (
                            <Table.Row id={debtor.clienteId}>
                                {/* Cliente */}
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border-2 border-slate-100">
                                            {debtor.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col max-w-[200px]">
                                            <span className="font-semibold text-slate-900 line-clamp-1" title={debtor.nombre}>
                                                {debtor.nombre}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                    ID: {debtor.clienteId}
                                                </span>
                                                {debtor.identificacion !== 'S/N' && (
                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                                                        {debtor.identificacion}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Categoría */}
                                <Table.Cell className="hidden lg:table-cell">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                            <Building2 className="h-3 w-3 text-slate-400" />
                                            {debtor.categoria}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <MapPin className="h-3 w-3 text-slate-400" />
                                            {debtor.zonaCobranza}
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Deuda */}
                                <Table.Cell>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {formatMoney(debtor.totalDeuda)}
                                    </span>
                                </Table.Cell>

                                {/* Situación (Semaforización) */}
                                <Table.Cell className="hidden md:table-cell">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`h-2 w-2 rounded-full ${debtor.documentosVencidos > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                            <span className="text-xs font-medium text-slate-700">
                                                {debtor.documentosVencidos} docs. vencidos
                                            </span>
                                        </div>
                                        {debtor.diasMoraMaximo > 0 && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                                                debtor.diasMoraMaximo > 90 ? 'bg-red-100 text-red-700' :
                                                debtor.diasMoraMaximo > 30 ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {debtor.diasMoraMaximo} días mora
                                            </span>
                                        )}
                                    </div>
                                </Table.Cell>

                                {/* Contacto */}
                                <Table.Cell className="hidden sm:table-cell">
                                    <ClientContactInfo telefonos={debtor.telefonos} compact={true} />
                                </Table.Cell>

                                {/* Acciones */}
                                <Table.Cell>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="link-gray" 
                                            size="sm"
                                            onClick={() => onViewDetail(debtor.clienteId)}
                                            className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <ArrowRight className="h-4 w-4" />
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