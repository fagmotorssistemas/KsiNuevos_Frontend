import { useState, useEffect } from "react";
import { 
    ArrowLeft, 
    Calendar, 
    FileText, 
    History, 
    Phone, 
    Store,
    User,
    AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation"; // O usa tu hook de navegación preferido

import { walletService } from "@/services/wallet.service";
import { DetalleDocumento, NotaGestion, ClienteDetalleResponse } from "@/types/wallet.types";
import { Button } from "@/components/ui/buttontable"; 
import { Table, TableCard } from "@/components/ui/table"; 
import { BadgeWithIcon } from "@/components/ui/badges";

interface ClientDetailProps {
    clientId: number;
    onBack: () => void; // Función para volver al listado
}

export function ClientDetail({ clientId, onBack }: ClientDetailProps) {
    const [data, setData] = useState<ClienteDetalleResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'docs' | 'notes'>('docs');

    useEffect(() => {
        const loadDetail = async () => {
            setLoading(true);
            try {
                const result = await walletService.getClientDetail(clientId);
                setData(result);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (clientId) loadDetail();
    }, [clientId]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-500 animate-pulse">Cargando expediente del cliente...</div>;
    }

    if (!data) {
        return <div className="p-12 text-center text-red-500">No se pudo cargar la información.</div>;
    }

    // Calculamos totales al vuelo para el encabezado
    const totalDeuda = data.documentos.reduce((acc, doc) => acc + doc.saldoPendiente, 0);
    const docsVencidos = data.documentos.filter(d => d.diasVencidos > 0).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* --- Encabezado del Cliente --- */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button variant="link-gray" size="sm" onClick={onBack} className="mt-1 h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900">Expediente de Cliente</h1>
                                <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded border border-slate-200">ID: {clientId}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><User className="h-4 w-4" /> Cliente Recurrente</span>
                                <span className="flex items-center gap-1"><Store className="h-4 w-4" /> Matriz</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Tarjeta de Resumen Rápido */}
                    <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Deuda Total</p>
                            <p className="text-xl font-bold text-slate-900">{formatMoney(totalDeuda)}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Estado</p>
                            <div className={`flex items-center gap-1.5 font-medium ${docsVencidos > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {docsVencidos > 0 ? <AlertCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                {docsVencidos > 0 ? `${docsVencidos} Docs. Vencidos` : 'Al día'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Tabs de Navegación --- */}
            <div className="flex items-center gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('docs')}
                    className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 transition-colors relative ${
                        activeTab === 'docs' ? 'text-red-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FileText className="h-4 w-4" />
                    Documentos Pendientes ({data.documentos.length})
                    {activeTab === 'docs' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></span>}
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 transition-colors relative ${
                        activeTab === 'notes' ? 'text-red-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <History className="h-4 w-4" />
                    Historial de Gestión ({data.notas.length})
                    {activeTab === 'notes' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></span>}
                </button>
            </div>

            {/* --- Contenido: Tabla de Documentos --- */}
            {activeTab === 'docs' && (
                <TableCard.Root>
                    <Table aria-label="Tabla de Facturas">
                        <Table.Header>
                            <Table.Head id="doc" label="Documento" />
                            <Table.Head id="dates" label="Emisión / Vencimiento" />
                            <Table.Head id="amount" label="Saldo Pendiente" />
                            <Table.Head id="status" label="Estado" />
                        </Table.Header>
                        <Table.Body items={data.documentos}>
                            {(doc: DetalleDocumento) => (
                                <Table.Row id={doc.numeroDocumento}>
                                    <Table.Cell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{doc.tipoDocumento}</span>
                                            <span className="text-xs text-slate-500 font-mono">{doc.numeroDocumento}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex flex-col text-sm">
                                            <span className="text-slate-600">E: {formatDate(doc.fechaEmision)}</span>
                                            <span className={`${doc.diasVencidos > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                                                V: {formatDate(doc.fechaVencimiento)}
                                            </span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{formatMoney(doc.saldoPendiente)}</span>
                                            <span className="text-xs text-slate-400">Original: {formatMoney(doc.valorOriginal)}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <BadgeWithIcon
                                            color={doc.diasVencidos > 0 ? 'error' : 'success'}
                                            iconLeading={doc.diasVencidos > 0 ? AlertCircle : undefined}
                                        >
                                            {doc.diasVencidos > 0 ? 'Vencido' : 'Por Vencer'}
                                        </BadgeWithIcon>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                </TableCard.Root>
            )}

            {/* --- Contenido: Tabla de Notas --- */}
            {activeTab === 'notes' && (
                <div className="space-y-4">
                    {data.notas.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <p className="text-slate-500">No hay registros de gestión para este cliente.</p>
                        </div>
                    ) : (
                        data.notas.map((nota, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex gap-4">
                                <div className="mt-1">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-slate-900 text-sm">Gestión realizada por: {nota.usuario}</span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(nota.fecha)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-100">
                                        "{nota.observacion}"
                                    </p>
                                    {nota.fechaProximaLlamada && (
                                        <div className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
                                            <History className="h-3 w-3" />
                                            Próxima llamada programada: {formatDate(nota.fechaProximaLlamada)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}