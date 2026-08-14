import React, { useState } from "react";
import { ArrowLeft, Folder } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";
import { ResumenTab } from "./tabs/ResumenTab";
import { FinanzasTab } from "./tabs/FinanzasTab";
import { ArchivosTab } from "./tabs/ArchivosTab";
import { WorkOrderModal } from "@/components/features/taller/trabajos/WorkOrderModal";

interface DetailProps {
    orden: OrdenTrabajo;
    onClose: () => void;
    isUploading: boolean;
    onTriggerUpload: (bucket: any, transaccionId?: string) => void;
    onUpdateContable: (id: string, status: string) => void;
    onPrint: () => void;
    onRefreshOrder?: () => void;
    onSaveObservaciones?: (texto: string) => Promise<{ success: boolean; error?: string }>;
    onSaveCliente?: (datos: {
        nombre_completo: string;
        telefono?: string;
        email?: string;
    }) => Promise<{ success: boolean; error?: string }>;
    onDeleteOrden?: () => Promise<{ success: boolean; error?: string }>;
    initialTab?: 'resumen' | 'finanzas' | 'archivos';
    backLabel?: string;
    subtitle?: string;
}

export function ExpedienteDetail({
    orden,
    onClose,
    isUploading,
    onTriggerUpload,
    onUpdateContable,
    onPrint,
    onRefreshOrder,
    onSaveObservaciones,
    onSaveCliente,
    onDeleteOrden,
    initialTab = 'resumen',
    backLabel = 'Volver a Carpetas',
    subtitle,
}: DetailProps) {
    const [activeTab, setActiveTab] = useState<'resumen' | 'finanzas' | 'archivos'>(initialTab);
    const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
    const [presupuestoUpdatedCount, setPresupuestoUpdatedCount] = useState(0);

    const handleCloseWorkOrderModal = () => {
        setShowWorkOrderModal(false);
        setPresupuestoUpdatedCount((c) => c + 1);
        onRefreshOrder?.();
    };

    const tabClass = (tab: typeof activeTab) =>
        `px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === tab
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
        }`;

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-slate-50/50">
                <div>
                    <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-3 font-medium transition-colors">
                        <ArrowLeft className="h-4 w-4" /> {backLabel}
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-200 rounded-lg">
                            <Folder className="h-6 w-6 text-slate-600" fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                                {orden.vehiculo_marca} {orden.vehiculo_modelo} <span className="text-slate-400 font-normal">({orden.vehiculo_placa})</span>
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5 font-medium">
                                Expediente #{orden.numero_orden}
                                {subtitle ? ` · ${subtitle}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex">
                    <button onClick={() => setActiveTab('resumen')} className={tabClass('resumen')}>Resumen</button>
                    <button onClick={() => setActiveTab('finanzas')} className={tabClass('finanzas')}>Finanzas</button>
                    <button onClick={() => setActiveTab('archivos')} className={tabClass('archivos')}>Documentos</button>
                </div>
            </div>

            <div className="flex-1 p-4 bg-slate-50/30 overflow-y-auto">
                <div className="mx-auto">
                    {activeTab === 'resumen' && (
                        <ResumenTab
                            orden={orden}
                            onUpdateContable={onUpdateContable}
                            onAssignPresupuesto={() => setShowWorkOrderModal(true)}
                            refreshDeps={presupuestoUpdatedCount}
                            onSaveObservaciones={onSaveObservaciones}
                            onSaveCliente={onSaveCliente}
                            onDeleteOrden={onDeleteOrden}
                            onRefreshOrder={onRefreshOrder}
                        />
                    )}

                    {activeTab === 'finanzas' && (
                        <FinanzasTab orden={orden} isUploading={isUploading} onTriggerUpload={onTriggerUpload} />
                    )}

                    {activeTab === 'archivos' && (
                        <ArchivosTab orden={orden} isUploading={isUploading} onTriggerUpload={onTriggerUpload} onPrint={onPrint} />
                    )}
                </div>
            </div>

            <WorkOrderModal
                orden={orden}
                isOpen={showWorkOrderModal}
                onClose={handleCloseWorkOrderModal}
                onStatusChange={(id, status) => onRefreshOrder?.()}
                onPrint={onPrint}
                initialTab="presupuesto"
            />
        </div>
    );
}
