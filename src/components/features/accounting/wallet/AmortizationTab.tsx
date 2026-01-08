import { useState, useEffect } from "react";
import { 
    CreditCard, 
    Calendar, 
    ChevronRight, 
    ArrowLeft, 
    FileText,
    Calculator 
} from "lucide-react";
import { walletService } from "@/services/wallet.service";
import { CreditoResumen, CuotaAmortizacion } from "@/types/wallet.types";
import { Table, TableCard } from "@/components/ui/table"; 

interface AmortizationTabProps {
    clientId: number;
}

export function AmortizationTab({ clientId }: AmortizationTabProps) {
    // Estados
    const [credits, setCredits] = useState<CreditoResumen[]>([]);
    const [selectedCredit, setSelectedCredit] = useState<CreditoResumen | null>(null);
    const [amortizationTable, setAmortizationTable] = useState<CuotaAmortizacion[]>([]);
    
    // Estados de carga
    const [loadingCredits, setLoadingCredits] = useState(true);
    const [loadingTable, setLoadingTable] = useState(false);

    // Formateadores
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-ES', { 
            day: '2-digit', month: 'short', year: 'numeric' 
        });
    };

    // 1. Cargar lista de créditos al montar
    useEffect(() => {
        const loadCredits = async () => {
            setLoadingCredits(true);
            try {
                const data = await walletService.getClientCredits(clientId);
                setCredits(data);
            } catch (error) {
                console.error("Error cargando créditos:", error);
            } finally {
                setLoadingCredits(false);
            }
        };
        loadCredits();
    }, [clientId]);

    // 2. Cargar tabla cuando se selecciona un crédito
    useEffect(() => {
        const loadTable = async () => {
            if (!selectedCredit) return;
            
            setLoadingTable(true);
            try {
                const data = await walletService.getAmortizationTable(selectedCredit.idCredito);
                setAmortizationTable(data);
            } catch (error) {
                console.error("Error cargando tabla:", error);
            } finally {
                setLoadingTable(false);
            }
        };
        loadTable();
    }, [selectedCredit]);

    // --- VISTAS ---

    // Vista de Carga Inicial
    if (loadingCredits) {
        return <div className="p-12 text-center text-slate-400 animate-pulse">Buscando operaciones de crédito...</div>;
    }

    // Vista: No hay créditos
    if (credits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <CreditCard className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Este cliente no tiene tablas de amortización activas.</p>
            </div>
        );
    }

    // Vista: Detalle de Tabla (Cuando seleccionas uno)
    if (selectedCredit) {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Cabecera del Detalle */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedCredit(null)}
                            className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="h-4 w-4 text-slate-600" />
                        </button>
                        <div>
                            <h3 className="font-bold text-slate-900">Operación #{selectedCredit.numeroOperacion}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                Inicio: {formatDate(selectedCredit.fechaInicio)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400 uppercase font-bold">Monto Original</p>
                        <p className="text-lg font-bold text-slate-900">{formatMoney(selectedCredit.montoOriginal)}</p>
                    </div>
                </div>

                {/* La Tabla en sí */}
                {loadingTable ? (
                    <div className="p-12 text-center text-slate-400 animate-pulse">Calculando cuotas...</div>
                ) : (
                    <TableCard.Root>
                        <Table aria-label="Tabla de Amortización">
                            <Table.Header>
                                <Table.Head id="ncuota" label="#" className="w-16" />
                                <Table.Head id="fecha" label="Vencimiento" />
                                <Table.Head id="capital" label="Capital" />
                                <Table.Head id="interes" label="Interés" />
                                <Table.Head id="cuota" label="Valor Cuota" />
                                <Table.Head id="saldo" label="Saldo Pendiente" />
                            </Table.Header>
                            <Table.Body items={amortizationTable}>
                                {(cuota: CuotaAmortizacion) => (
                                    <Table.Row id={cuota.numeroCuota}>
                                        <Table.Cell>
                                            <span className="font-mono text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded">
                                                {cuota.numeroCuota}
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="font-mono text-sm text-slate-700">
                                                {formatDate(cuota.fechaVencimiento)}
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-slate-600 text-sm">{formatMoney(cuota.capital)}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-slate-600 text-sm">{formatMoney(cuota.interes)}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="font-bold text-slate-900 text-sm">{formatMoney(cuota.valorCuota)}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="font-mono text-emerald-700 text-sm font-medium">
                                                {formatMoney(cuota.saldoPendiente)}
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </TableCard.Root>
                )}
            </div>
        );
    }

    // Vista: Lista de Créditos (Selección Inicial)
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
            {credits.map((credito) => (
                <button
                    key={credito.idCredito}
                    onClick={() => setSelectedCredit(credito)}
                    className="group flex flex-col items-start p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="h-16 w-16 text-blue-600 transform rotate-12" />
                    </div>

                    <div className="flex items-center gap-3 mb-4 w-full">
                        <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Calculator className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Operación</p>
                            <p className="text-lg font-bold text-slate-900">#{credito.numeroOperacion}</p>
                        </div>
                    </div>

                    <div className="space-y-2 w-full mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Monto Original:</span>
                            <span className="font-medium text-slate-900">{formatMoney(credito.montoOriginal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Fecha Inicio:</span>
                            <span className="font-medium text-slate-900">{formatDate(credito.fechaInicio)}</span>
                        </div>
                    </div>

                    <div className="mt-auto w-full pt-3 border-t border-slate-100 flex items-center justify-between text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                        Ver Tabla de Pagos
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </button>
            ))}
        </div>
    );
}