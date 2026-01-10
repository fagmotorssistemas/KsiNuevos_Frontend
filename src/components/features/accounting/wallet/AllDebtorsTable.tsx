import { useState } from "react";
import { 
    Users, 
    ArrowRight,
    Building2,
    MapPin,
    MessageCircle,
    Search,
    Eye,
    Phone,
    Filter,
    XCircle,
    CheckCircle2
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table"; 
import { ClienteDeudaSummary } from "@/types/wallet.types";
import { ClientContactInfo } from "./ClientContactInfo";

interface AllDebtorsTableProps {
    debtors: ClienteDeudaSummary[];
    onViewDetail: (clienteId: number) => void;
    loading?: boolean;
}

export function AllDebtorsTable({ debtors, onViewDetail, loading }: AllDebtorsTableProps) {
    // Estado para controlar si el filtro de "Solo Morosos" está activo
    const [showOnlyMorosos, setShowOnlyMorosos] = useState(false);

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

    // Lógica de filtrado:
    // Si showOnlyMorosos es true, filtramos los que tengan > 0 documentos vencidos.
    // Si es false, mostramos todos (debtors).
    const filteredDebtors = showOnlyMorosos 
        ? debtors.filter(d => d.documentosVencidos > 0)
        : debtors;

    if (!loading && debtors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Search className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No se encontraron clientes.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Cabecera con Título y Filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Directorio de Clientes
                </h3>

                <div className="flex items-center gap-3">
                    {/* BOTÓN DE FILTRO NUEVO */}
                    <button
                        onClick={() => setShowOnlyMorosos(!showOnlyMorosos)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            showOnlyMorosos
                                ? "bg-red-50 text-red-700 border-red-200 shadow-sm ring-2 ring-red-500/10"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        title={showOnlyMorosos ? "Ver todos los clientes" : "Ver solo clientes con deuda vencida"}
                    >
                        {showOnlyMorosos ? (
                            <>
                                <XCircle className="h-3.5 w-3.5" />
                                Filtrando: Solo Morosos
                            </>
                        ) : (
                            <>
                                <Filter className="h-3.5 w-3.5" />
                                Filtrar Morosos
                            </>
                        )}
                    </button>
                    
                    <span className="hidden sm:inline-block text-xs text-slate-500 font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
                        Total: {filteredDebtors.length}
                    </span>
                </div>
            </div>

            <TableCard.Root>
                <Table aria-label="Directorio de Clientes">
                    <Table.Header>
                        <Table.Head id="client" label="Cliente / ID" />
                        <Table.Head id="category" label="Ubicación" className="hidden lg:table-cell" />
                        <Table.Head id="debt" label="Saldo Actual" />
                        <Table.Head id="status" label="Estado" className="hidden md:table-cell" />
                        <Table.Head id="contact" label="Contacto" className="hidden sm:table-cell" />
                        <Table.Head id="actions" label="Acciones" className="text-right pr-4" />
                    </Table.Header>

                    <Table.Body items={filteredDebtors}>
                        {(debtor: ClienteDeudaSummary) => (
                            <Table.Row id={debtor.clienteId}>
                                {/* Cliente */}
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
                                                <span className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                    #{debtor.clienteId}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Categoría/Ubicación */}
                                <Table.Cell className="hidden lg:table-cell">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                            {debtor.zonaCobranza}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Building2 className="h-3.5 w-3.5 text-slate-300" />
                                            {debtor.categoria}
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Deuda */}
                                <Table.Cell>
                                    <span className="font-bold text-slate-800 text-sm tracking-tight">
                                        {formatMoney(debtor.totalDeuda)}
                                    </span>
                                </Table.Cell>

                                {/* Estado */}
                                <Table.Cell className="hidden md:table-cell">
                                    {debtor.documentosVencidos > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                            Vencido ({debtor.documentosVencidos})
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Al día
                                        </span>
                                    )}
                                </Table.Cell>

                                {/* Contacto */}
                                <Table.Cell className="hidden sm:table-cell">
                                    <ClientContactInfo telefonos={debtor.telefonos} compact={true} />
                                </Table.Cell>

                                {/* Acciones (DISEÑO MEJORADO) */}
                                <Table.Cell>
                                    <div className="flex items-center justify-end gap-2 pr-2">
                                        {/* Botón WhatsApp - Verde y Prominente */}
                                        {(debtor.telefonos.celular || debtor.telefonos.principal) ? (
                                            <button
                                                onClick={() => handleWhatsApp(debtor.telefonos)}
                                                className="group relative flex items-center justify-center h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-600 transition-all duration-200 shadow-sm"
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle className="h-4.5 w-4.5" />
                                            </button>
                                        ) : (
                                            /* Placeholder deshabilitado visualmente si no hay teléfono */
                                            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                        )}

                                        {/* Botón Ver Detalle - Azul y Sólido */}
                                        <button
                                            onClick={() => onViewDetail(debtor.clienteId)}
                                            className="flex items-center gap-2 px-3 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-700 transition-all duration-200 shadow-sm font-medium text-xs group"
                                            title="Ver expediente del cliente"
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

            {/* Mensaje cuando el filtro está activo pero no hay resultados */}
            {showOnlyMorosos && filteredDebtors.length === 0 && debtors.length > 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-slate-900 font-medium">¡Excelente!</h3>
                    <p className="text-slate-500 text-sm">No hay clientes con deuda vencida en esta lista.</p>
                    <button 
                        onClick={() => setShowOnlyMorosos(false)}
                        className="mt-3 text-blue-600 text-xs font-medium hover:underline"
                    >
                        Ver todos los clientes
                    </button>
                </div>
            )}
        </div>
    );
}