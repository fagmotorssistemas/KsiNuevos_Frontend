"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Folder, FileText, Loader2 } from "lucide-react";
import { useExpedientes } from "@/hooks/taller/useExpedientes";
import { OrdenTrabajo } from "@/types/taller";

// Componentes Modularizados
import { ExpedientesTopBar, CLIENTE_INTERNO_FAG_ID, CLIENTE_INTERNO_AUTOMEKANO_ID, isOrdenClienteExterno, type ClienteTipoFilter, type OrdenamientoFilter } from "@/components/features/taller/expedientes/ExpedientesTopBar";
import { FolderCard } from "@/components/features/taller/expedientes/FolderCard";
import { ExpedienteDetail } from "@/components/features/taller/expedientes/ExpedienteDetail";
import { OrderPrintView } from "@/components/features/taller/OrderPrintView";

export default function ExpedientesPage() {
    const { ordenes, isLoading, subirArchivo, actualizarEstadoContable, fetchExpedientes } = useExpedientes();
    
    // Estados de Filtros
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [selectedContableStatus, setSelectedContableStatus] = useState<string | null>(null); // NUEVO ESTADO CONTABLE
    const [selectedClienteTipo, setSelectedClienteTipo] = useState<ClienteTipoFilter>("");
    const [ordenamiento, setOrdenamiento] = useState<OrdenamientoFilter>("fecha_ingreso_desc");
    
    const [selectedOrder, setSelectedOrder] = useState<OrdenTrabajo | null>(null);

    // Estados para Subida de Archivos
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadConfig, setUploadConfig] = useState<{bucket: any, transaccionId?: string} | null>(null);

    const printComponentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printComponentRef,
        documentTitle: selectedOrder ? `Orden_${selectedOrder.numero_orden}` : "Orden_Trabajo",
    });

    // Sincronizar selectedOrder con las actualizaciones de la BD
    useEffect(() => {
        if (selectedOrder) {
            const updated = ordenes.find(o => o.id === selectedOrder.id);
            if (updated) setSelectedOrder(updated);
        }
    }, [ordenes, selectedOrder]);

    const filteredOrdenes = useMemo(() => {
        const filtered = ordenes.filter(o => {
            const term = searchTerm.toLowerCase().trim();
            const vehiculoCompleto = [o.vehiculo_marca, o.vehiculo_modelo].filter(Boolean).join(' ').toLowerCase();
            const matchesSearch = !term || 
                (o.vehiculo_placa?.toLowerCase().includes(term)) || 
                (o.cliente?.nombre_completo?.toLowerCase().includes(term)) ||
                (o.numero_orden.toString().includes(term)) ||
                (o.vehiculo_marca?.toLowerCase().includes(term)) ||
                (o.vehiculo_modelo?.toLowerCase().includes(term)) ||
                (vehiculoCompleto && vehiculoCompleto.includes(term));
            
            const matchesStatus = selectedStatus ? o.estado === selectedStatus : true;
            // @ts-ignore
            const matchesContable = selectedContableStatus ? o.estado_contable === selectedContableStatus : true;

            const matchesClienteTipo = !selectedClienteTipo ? true
                : selectedClienteTipo === "interno_fag" ? o.cliente_id === CLIENTE_INTERNO_FAG_ID
                : selectedClienteTipo === "interno_automekano" ? o.cliente_id === CLIENTE_INTERNO_AUTOMEKANO_ID
                : isOrdenClienteExterno(o.cliente_id);
            
            return matchesSearch && matchesStatus && matchesContable && matchesClienteTipo;
        });

        const sorted = [...filtered].sort((a, b) => {
            switch (ordenamiento) {
                case "fecha_ingreso_desc":
                    return new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime();
                case "fecha_ingreso_asc":
                    return new Date(a.fecha_ingreso).getTime() - new Date(b.fecha_ingreso).getTime();
                case "numero_orden_desc":
                    return b.numero_orden - a.numero_orden;
                case "numero_orden_asc":
                    return a.numero_orden - b.numero_orden;
                case "placa_asc":
                    return (a.vehiculo_placa || "").localeCompare(b.vehiculo_placa || "", "es");
                default:
                    return 0;
            }
        });
        return sorted;
    }, [ordenes, searchTerm, selectedStatus, selectedContableStatus, selectedClienteTipo, ordenamiento]);

    // Función que se pasa a los TABS para abrir el input file
    const triggerUpload = (bucket: 'taller-evidencias' | 'taller-comprobantes' | 'ordenes-trabajo' | 'taller-facturas', transaccionId?: string) => {
        setUploadConfig({ bucket, transaccionId });
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedOrder || !uploadConfig) return;

        setIsUploading(true);
        await subirArchivo(selectedOrder.id, file, uploadConfig.bucket, uploadConfig.transaccionId);
        setIsUploading(false);
        setUploadConfig(null);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 font-sans text-slate-900 overflow-hidden">
            
            {/* Input Oculto de Gestión Global de Archivos */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,application/pdf"
            />

            {/* Top Bar de Filtros (Solo visible cuando NO hay un expediente abierto) */}
            {!selectedOrder && (
                <ExpedientesTopBar 
                    ordenes={ordenes}
                    selectedStatus={selectedStatus}
                    onSelectStatus={(status) => setSelectedStatus(status)}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    selectedContableStatus={selectedContableStatus}
                    onSelectContableStatus={setSelectedContableStatus}
                    selectedClienteTipo={selectedClienteTipo}
                    onSelectClienteTipo={setSelectedClienteTipo}
                    ordenamiento={ordenamiento}
                    onOrdenamientoChange={setOrdenamiento}
                />
            )}

            <div className="flex-1 flex flex-col w-full relative overflow-hidden">
                {selectedOrder ? (
                    
                    <ExpedienteDetail
                        orden={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        isUploading={isUploading}
                        onTriggerUpload={triggerUpload}
                        onUpdateContable={actualizarEstadoContable}
                        onPrint={() => handlePrint?.()}
                        onRefreshOrder={fetchExpedientes}
                    />

                ) : (
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-4">
                                {selectedStatus ? selectedStatus.replace('_', ' ').toUpperCase() : 'TODOS LOS EXPEDIENTES'}
                                <span className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full font-bold ml-2">
                                    {filteredOrdenes.length} Archivos
                                </span>
                            </h2>
                            
                            {isLoading ? (
                                <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
                                    <Loader2 className="animate-spin h-6 w-6" /> <span className="font-medium">Cargando carpetas...</span>
                                </div>
                            ) : filteredOrdenes.length === 0 ? (
                                <div className="text-center p-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                                    <Folder className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium">No hay expedientes en esta vista.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                    {filteredOrdenes.map(orden => (
                                        <FolderCard key={orden.id} orden={orden} onClick={() => setSelectedOrder(orden)} />
                                    ))}
                                </div>
                            )}

                            {/* {!isLoading && filteredOrdenes.length > 0 && (
                                // <div className="mt-12">
                                //     <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Últimas Proformas Generadas</h3>
                                //     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                //         <table className="w-full text-sm text-left">
                                //             <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                //                 <tr>
                                //                     <th className="px-6 py-4">Documento</th>
                                //                     <th className="px-6 py-4">Expediente</th>
                                //                     <th className="px-6 py-4">Fecha de Ingreso</th>
                                //                 </tr>
                                //             </thead>
                                //             <tbody className="divide-y divide-slate-100">
                                //                 {filteredOrdenes.slice(0, 3).map((o, idx) => (
                                //                     <tr key={idx} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedOrder(o)}>
                                //                         <td className="px-6 py-4 font-medium flex items-center gap-3">
                                //                             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                //                                 <FileText className="h-4 w-4" /> 
                                //                             </div>
                                //                             Proforma_Orden_{o.numero_orden}.pdf
                                //                         </td>
                                //                         <td className="px-6 py-4 text-slate-600">{o.vehiculo_marca} ({o.vehiculo_placa})</td>
                                //                         <td className="px-6 py-4 text-slate-400">{new Date(o.fecha_ingreso).toLocaleDateString()}</td>
                                //                     </tr>
                                //                 ))}
                                //             </tbody>
                                //         </table>
                                //     </div>
                                // </div>
                            )} */}
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden">
                {selectedOrder && (
                    <OrderPrintView ref={printComponentRef} orden={selectedOrder} />
                )}
            </div>
        </div>
    );
}