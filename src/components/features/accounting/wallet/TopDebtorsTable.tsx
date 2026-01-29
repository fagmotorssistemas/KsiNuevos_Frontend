import { 
    User, 
    FileWarning, 
    ArrowRight,
    Building2,
    MapPin,
    MessageCircle,
    Phone,
    XCircle,
    CheckCircle2,
    ListFilter
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table"; 
import { ClienteDeudaSummary } from "@/types/wallet.types";
import { ClientContactInfo } from "./ClientContactInfo";

interface TopDebtorsTableProps {
    debtors: ClienteDeudaSummary[];
    onViewDetail: (clienteId: number) => void;
    // Props para el filtro externo
    filterMode: 'all' | 'vencidos' | 'aldia';
    onFilterChange: (mode: 'all' | 'vencidos' | 'aldia') => void;
}

export function TopDebtorsTable({ debtors, onViewDetail, filterMode, onFilterChange }: TopDebtorsTableProps) {
    
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const handleWhatsApp = (telefonos: { celular: string | null, principal: string | null }) => {
        const rawPhone = telefonos.celular || telefonos.principal;
        if (!rawPhone) return;
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('09')) {
            cleanPhone = '593' + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('0') && cleanPhone.length === 9) {
            cleanPhone = '593' + cleanPhone.substring(1);
        } else if (cleanPhone.length === 7) {
            cleanPhone = '5937' + cleanPhone;
        }
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    // Lógica de filtrado usando el prop filterMode
    const filteredDebtors = debtors.filter(d => {
        if (filterMode === 'vencidos') return d.documentosVencidos > 0;
        if (filterMode === 'aldia') return d.documentosVencidos === 0;
        return true; // 'all'
    });

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
            {/* Cabecera con Título y Filtros */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-1">
                <div className="flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <FileWarning className="h-5 w-5 text-red-600" />
                        Top Deudores
                    </h3>
                    <span className="text-xs text-slate-500 mt-1">
                        Clientes con mayor riesgo o deuda acumulada
                    </span>
                </div>

                {/* Grupo de Botones de Filtro (Usando props) */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-100/50 p-1 rounded-lg border border-slate-200 w-fit">
                    <button
                        onClick={() => onFilterChange('all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            filterMode === 'all'
                                ? "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                    >
                        <ListFilter className="h-3.5 w-3.5" />
                        Todos
                    </button>

                    <button
                        onClick={() => onFilterChange('vencidos')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            filterMode === 'vencidos'
                                ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200"
                                : "text-slate-500 hover:text-red-600 hover:bg-red-50/50"
                        }`}
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        Vencidos
                    </button>

                    <button
                        onClick={() => onFilterChange('aldia')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            filterMode === 'aldia'
                                ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                                : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50"
                        }`}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Al día
                    </button>

                    <div className="w-px h-4 bg-slate-300 mx-1 hidden sm:block"></div>
                    <span className="text-[10px] text-slate-400 font-mono px-2">
                        {filteredDebtors.length} regs
                    </span>
                </div>
            </div>

            <TableCard.Root>
                <Table aria-label="Tabla de Top Deudores">
                    <Table.Header>
                        <Table.Head id="client" label="Cliente / ID" />
                        <Table.Head id="category" label="Categoría / Zona" className="hidden lg:table-cell" />
                        <Table.Head id="debt" label="Deuda Total" />
                        <Table.Head id="status" label="Situación" className="hidden md:table-cell" />
                        <Table.Head id="contact" label="Contacto Directo" className="hidden sm:table-cell" />
                        <Table.Head id="actions" label="Acciones" className="text-right pr-4" />
                    </Table.Header>

                    <Table.Body items={filteredDebtors}>
                        {(debtor: ClienteDeudaSummary) => (
                            <Table.Row id={debtor.clienteId}>
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border-2 border-slate-100">
                                            {debtor.nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col max-w-[200px]">
                                            <span className="font-semibold text-slate-900 line-clamp-1 text-sm" title={debtor.nombre}>
                                                {debtor.nombre}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                    #{debtor.clienteId}
                                                </span>
                                                {debtor.identificacion !== 'S/N' && (
                                                    <span className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono hidden xl:inline-block">
                                                        {debtor.identificacion}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Table.Cell>

                                <Table.Cell className="hidden lg:table-cell">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                            {debtor.categoria}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <MapPin className="h-3.5 w-3.5 text-slate-300" />
                                            {debtor.zonaCobranza}
                                        </div>
                                    </div>
                                </Table.Cell>

                                <Table.Cell>
                                    <span className="font-bold text-slate-900 text-sm tracking-tight">
                                        {formatMoney(debtor.totalDeuda)}
                                    </span>
                                </Table.Cell>

                                <Table.Cell className="hidden md:table-cell">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`h-2 w-2 rounded-full ${debtor.documentosVencidos > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                            <span className={`text-xs font-medium ${debtor.documentosVencidos > 0 ? 'text-slate-700' : 'text-emerald-700'}`}>
                                                {debtor.documentosVencidos > 0 
                                                    ? `${debtor.documentosVencidos} docs. vencidos`
                                                    : 'Al día'}
                                            </span>
                                        </div>
                                        {debtor.diasMoraMaximo > 0 && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                                                debtor.diasMoraMaximo > 90 ? 'bg-red-100 text-red-700 border border-red-200' :
                                                debtor.diasMoraMaximo > 30 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                                {debtor.diasMoraMaximo} días mora
                                            </span>
                                        )}
                                    </div>
                                </Table.Cell>

                                <Table.Cell className="hidden sm:table-cell">
                                    <ClientContactInfo telefonos={debtor.telefonos} compact={true} />
                                </Table.Cell>

                                <Table.Cell>
                                    <div className="flex items-center justify-end gap-2 pr-2">
                                        {(debtor.telefonos.celular || debtor.telefonos.principal) ? (
                                            <button
                                                onClick={() => handleWhatsApp(debtor.telefonos)}
                                                className="group relative flex items-center justify-center h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-600 transition-all duration-200 shadow-sm"
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle className="h-4.5 w-4.5" />
                                            </button>
                                        ) : (
                                            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                        )}

                                        <button
                                            onClick={() => onViewDetail(debtor.clienteId)}
                                            className="flex items-center gap-2 px-3 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-700 transition-all duration-200 shadow-sm font-medium text-xs group"
                                            title="Ver Expediente"
                                        >
                                            <span className="hidden xl:inline">Ver detalle</span>
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </TableCard.Root>
            
            {filterMode !== 'all' && filteredDebtors.length === 0 && debtors.length > 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                    {filterMode === 'vencidos' ? (
                        <>
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                            <h3 className="text-slate-900 font-medium">¡Excelente!</h3>
                            <p className="text-slate-500 text-sm">No hay clientes con deuda vencida.</p>
                        </>
                    ) : (
                        <>
                            <FileWarning className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                            <h3 className="text-slate-900 font-medium">Sin clientes al día</h3>
                            <p className="text-slate-500 text-sm">Todos los clientes listados tienen deuda.</p>
                        </>
                    )}
                    <button 
                        onClick={() => onFilterChange('all')}
                        className="mt-3 text-blue-600 text-xs font-medium hover:underline"
                    >
                        Ver listado completo
                    </button>
                </div>
            )}
        </div>
    );
}