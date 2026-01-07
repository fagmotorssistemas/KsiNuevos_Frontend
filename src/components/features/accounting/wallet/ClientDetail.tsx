import { useState, useEffect } from "react";
import { 
    ArrowLeft, 
    Calendar, 
    FileText, 
    History, 
    User,
    AlertCircle,
    Hash,
    StickyNote,
    Car,
    CreditCard,
    Phone
} from "lucide-react";
import { walletService } from "@/services/wallet.service";
import { DetalleDocumento, ClienteDetalleResponse, HistorialVenta, HistorialPago } from "@/types/wallet.types";
import { Button } from "@/components/ui/buttontable"; 
import { Table, TableCard } from "@/components/ui/table"; 
import { BadgeWithIcon } from "@/components/ui/badges";
import { ClientContactInfo } from "./ClientContactInfo";

interface ClientDetailProps {
    clientId: number;
    onBack: () => void;
}

export function ClientDetail({ clientId, onBack }: ClientDetailProps) {
    const [data, setData] = useState<ClienteDetalleResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'docs' | 'sales' | 'payments' | 'notes'>('docs');

    useEffect(() => {
        const loadDetail = async () => {
            setLoading(true);
            try {
                const result = await walletService.getClientDetail(clientId);
                
                // 🔍 DEBUG TEMPORAL - Eliminar después de verificar
                console.log('🎯 Respuesta completa del backend:', result);
                console.log('👤 Nombre del cliente:', (result as any).nombre || (result as any).nombreCliente);
                console.log('📄 Primer documento:', result.documentos[0]);
                
                setData(result);
            } catch (error) {
                console.error('❌ Error cargando detalle:', error);
            } finally {
                setLoading(false);
            }
        };
        if (clientId) loadDetail();
    }, [clientId]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
        }).format(amount);
    };
    
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        } catch (e) {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500 animate-pulse">
                Cargando expediente completo...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-12 text-center text-red-500">
                Error al cargar datos del cliente.
            </div>
        );
    }

    const firstDoc = data.documentos[0];
    const totalDeuda = data.documentos.reduce((acc, doc) => acc + doc.saldoPendiente, 0);
    const docsVencidos = data.documentos.filter(d => d.diasMora > 0).length;
    
    // ✅ EXTRACCIÓN CORRECTA DEL NOMBRE Y DATOS DEL CLIENTE
    const nombreCliente = 
        (data as any).nombre || 
        (data as any).nombreCliente || 
        firstDoc?.nombreCliente || 
        `Cliente #${clientId}`;
    
    const telefonosCliente = {
        principal: (data as any).telefono1 || firstDoc?.telefono1 || null,
        secundario: (data as any).telefono2 || firstDoc?.telefono2 || null,
        celular: (data as any).telefono3 || firstDoc?.telefono3 || null
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* ENCABEZADO */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        
                        {/* Info Principal */}
                        <div className="flex gap-4">
                            <Button 
                                variant="link-gray" 
                                size="sm" 
                                onClick={onBack} 
                                className="h-10 w-10 p-0 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 shrink-0"
                            >
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                            <div>
                                <div className="flex flex-col gap-1 mb-2">
                                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                                        {nombreCliente}
                                    </h1>
                                    <div className="flex items-center gap-2">
                                        {firstDoc?.categoriaCliente && (
                                            <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider">
                                                {firstDoc.categoriaCliente}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                    <span className="hidden md:inline text-slate-300">|</span>
                                    <span className="flex items-center gap-1.5">
                                        <Hash className="h-4 w-4 text-slate-400" />
                                        ID Sistema: {clientId}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Totales Financieros */}
                        <div className="flex items-center gap-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                                    Saldo Total
                                </p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {formatMoney(totalDeuda)}
                                </p>
                            </div>
                            <div className="h-10 w-px bg-slate-100"></div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                                    Estado Cuenta
                                </p>
                                <div className={`flex items-center gap-2 font-bold ${
                                    docsVencidos > 0 ? 'text-red-600' : 'text-emerald-600'
                                }`}>
                                    {docsVencidos > 0 ? (
                                        <AlertCircle className="h-5 w-5" />
                                    ) : (
                                        <FileText className="h-5 w-5" />
                                    )}
                                    {docsVencidos > 0 ? 'MOROSO' : 'AL DÍA'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN DE CONTACTO */}
                <div className="px-6 py-4 bg-white border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Información de Contacto
                    </p>
                    <ClientContactInfo telefonos={telefonosCliente} />
                </div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-6 border-b border-slate-200 px-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('docs')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap relative ${
                        activeTab === 'docs' 
                            ? 'text-red-600 border-b-2 border-red-600' 
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FileText className="h-4 w-4" />
                    Kardex de Deuda ({data.documentos.length})
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap relative ${
                        activeTab === 'sales' 
                            ? 'text-red-600 border-b-2 border-red-600' 
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Car className="h-4 w-4" />
                    Compras ({data.ventas?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap relative ${
                        activeTab === 'payments' 
                            ? 'text-red-600 border-b-2 border-red-600' 
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <CreditCard className="h-4 w-4" />
                    Pagos ({data.pagos?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap relative ${
                        activeTab === 'notes' 
                            ? 'text-red-600 border-b-2 border-red-600' 
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <History className="h-4 w-4" />
                    Gestión ({data.notas.length})
                </button>
            </div>

            {/* TAB: KARDEX DE DEUDA */}
            {activeTab === 'docs' && (
                <TableCard.Root>
                    <Table aria-label="Kardex de Deuda">
                        <Table.Header>
                            <Table.Head id="doc" label="Documento / Físico" />
                            <Table.Head id="quota" label="Letra/Cuota" />
                            <Table.Head id="dates" label="Fechas Clave" />
                            <Table.Head id="mora" label="Días Mora" />
                            <Table.Head id="values" label="Saldos" />
                            <Table.Head id="obs" label="Obs." className="hidden lg:table-cell" />
                        </Table.Header>
                        <Table.Body items={data.documentos}>
                            {(doc: DetalleDocumento) => {
                                // DETECCIÓN DE CUOTA ADICIONAL
                                const esCuotaAdicional = doc.numeroDocumento && doc.numeroDocumento.includes("LET FV");
                                
                                return (
                                <Table.Row id={doc.numeroDocumento}>
                                    <Table.Cell>
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-slate-800 text-sm">
                                                {doc.tipoDocumento}
                                            </span>
                                            
                                            {/* RENDERIZADO CONDICIONAL DE ETIQUETA */}
                                            {esCuotaAdicional ? (
                                                <div className="mt-1 flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 w-fit uppercase">
                                                        Cuota Adicional
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {doc.numeroDocumento}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-1 rounded w-fit">
                                                    Int: {doc.numeroDocumento}
                                                </span>
                                            )}

                                            {doc.numeroFisico && doc.numeroFisico !== doc.numeroDocumento && (
                                                <span className="text-[11px] text-blue-600 font-mono mt-0.5">
                                                    Físico: {doc.numeroFisico}
                                                </span>
                                            )}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-1 rounded text-xs font-semibold">
                                            Cuota {doc.numeroCuota}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex flex-col text-xs gap-1">
                                            <div className="flex justify-between w-32">
                                                <span className="text-slate-400">Emisión:</span>
                                                <span className="text-slate-700 font-mono">
                                                    {formatDate(doc.fechaEmision)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between w-32">
                                                <span className="text-slate-400">Vence:</span>
                                                <span className={`font-bold font-mono ${
                                                    doc.diasMora > 0 ? 'text-red-600' : 'text-emerald-600'
                                                }`}>
                                                    {formatDate(doc.fechaVencimiento)}
                                                </span>
                                            </div>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {doc.diasMora > 0 ? (
                                            <BadgeWithIcon color="error" iconLeading={AlertCircle}>
                                                {doc.diasMora} días
                                            </BadgeWithIcon>
                                        ) : (
                                            <BadgeWithIcon color="success">Por Vencer</BadgeWithIcon>
                                        )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-slate-900">
                                                {formatMoney(doc.saldoPendiente)}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                de {formatMoney(doc.valorOriginal)}
                                            </span>
                                            <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div 
                                                    className={`h-full ${
                                                        doc.diasMora > 0 ? 'bg-red-500' : 'bg-emerald-500'
                                                    }`} 
                                                    style={{ 
                                                        width: `${(doc.saldoPendiente / doc.valorOriginal) * 100}%` 
                                                    }} 
                                                />
                                            </div>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell className="hidden lg:table-cell">
                                        {doc.observacionDoc && (
                                            <div className="group relative">
                                                <StickyNote className="h-4 w-4 text-amber-400 cursor-help" />
                                                <div className="absolute right-0 w-48 bg-white p-2 rounded shadow-xl border border-slate-100 text-xs text-slate-600 z-10 hidden group-hover:block">
                                                    {doc.observacionDoc}
                                                </div>
                                            </div>
                                        )}
                                    </Table.Cell>
                                </Table.Row>
                            )}}
                        </Table.Body>
                    </Table>
                </TableCard.Root>
            )}

            {/* TAB: HISTORIAL DE VENTAS */}
            {activeTab === 'sales' && (
                <div className="space-y-4">
                    {data.ventas && data.ventas.length > 0 ? (
                        data.ventas.map((venta, idx) => (
                            <div 
                                key={idx} 
                                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row"
                            >
                                <div className="p-4 bg-slate-50 border-r border-slate-100 flex flex-col justify-center items-center w-full md:w-32 shrink-0">
                                    <Car className="h-8 w-8 text-slate-400 mb-2" />
                                    <span className="text-xs font-mono text-slate-500">
                                        {formatDate(venta.fecha)}
                                    </span>
                                </div>
                                <div className="p-4 flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-900 text-md">
                                            {venta.producto}
                                        </h3>
                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-sm border border-emerald-100">
                                            {formatMoney(venta.valorTotal)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold">
                                                Referencia / Placa
                                            </p>
                                            <p className="text-slate-700 font-mono">
                                                {venta.referencia}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold">
                                                Vendedor
                                            </p>
                                            <p className="text-slate-700">{venta.vendedor}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-slate-400 uppercase font-bold">
                                                Detalles / Chasis
                                            </p>
                                            <p className="text-slate-600 font-mono text-xs">
                                                {venta.observaciones || 'Sin detalles adicionales'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                            No se encontró historial de compras de vehículos
                        </div>
                    )}
                </div>
            )}

            {/* TAB: HISTORIAL DE PAGOS */}
            {activeTab === 'payments' && (
                <TableCard.Root>
                    <Table aria-label="Historial de Pagos">
                        <Table.Header>
                            <Table.Head id="date" label="Fecha" />
                            <Table.Head id="recibo" label="Recibo / Referencia" />
                            <Table.Head id="concept" label="Concepto" />
                            <Table.Head id="amount" label="Monto Pagado" />
                            <Table.Head id="user" label="Registrado por" />
                        </Table.Header>
                        <Table.Body items={data.pagos || []}>
                            {(pago: HistorialPago) => (
                                <Table.Row id={pago.numeroRecibo}>
                                    <Table.Cell>
                                        <div className="flex items-center gap-2 font-mono text-sm text-slate-700">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            {formatDate(pago.fecha)}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm">
                                                #{pago.numeroRecibo}
                                            </span>
                                            <span className="text-xs text-slate-500 font-mono">
                                                Ref: {pago.referenciaPago}
                                            </span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="text-sm text-slate-600">
                                            {pago.concepto}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                            {formatMoney(pago.montoTotal)}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {pago.usuario.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {pago.usuario}
                                            </span>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                </TableCard.Root>
            )}

            {/* TAB: NOTAS DE GESTIÓN */}
            {activeTab === 'notes' && (
                <div className="space-y-4">
                    {data.notas.length > 0 ? (
                        data.notas.map((nota, idx) => (
                            <div 
                                key={idx} 
                                className="bg-white p-4 rounded-lg border-l-4 border-l-blue-500 border-y border-r border-slate-200 shadow-sm flex gap-4"
                            >
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                                                {nota.usuario.charAt(0).toUpperCase()}
                                            </div>
                                            {nota.usuario}
                                        </span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(nota.fecha)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        {nota.observacion}
                                    </p>
                                    {nota.fechaProximaLlamada && (
                                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                                            <Phone className="h-3 w-3" /> 
                                            Llamar de nuevo: {formatDate(nota.fechaProximaLlamada)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                            No hay gestiones registradas
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}