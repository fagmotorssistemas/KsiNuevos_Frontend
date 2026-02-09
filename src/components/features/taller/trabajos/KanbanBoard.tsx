import React from 'react';
import { OrdenTrabajo } from "@/types/taller";
import { JobCard } from "./JobCard";

interface KanbanBoardProps {
    ordenes: OrdenTrabajo[];
    onCardClick: (orden: OrdenTrabajo) => void;
}

// Configuración visual de las columnas (Paleta Azul/Negro/Gris)
const COLUMN_STYLES: Record<string, string> = {
    recepcion: 'border-slate-300 bg-slate-50/50', // Gris suave
    en_cola: 'border-slate-500 bg-slate-100/50',   // Gris medio
    en_proceso: 'border-blue-600 bg-blue-50/30',   // Azul (Foco)
    terminado: 'border-black bg-slate-50/80',      // Negro
};

const COLUMNS = [
    { id: 'recepcion', title: 'Recepción' },
    { id: 'en_cola', title: 'En Cola' },
    { id: 'en_proceso', title: 'En Proceso' },
    { id: 'terminado', title: 'Terminado' }
];

export default function KanbanBoard({ ordenes, onCardClick }: KanbanBoardProps) {
    return (
        <div className="flex h-full min-h-[600px] w-full gap-6 overflow-x-auto bg-white p-6 pb-8">
            {COLUMNS.map((col) => {
                // Filtramos las órdenes reales que vienen por props
                const columnOrders = ordenes.filter(o => o.estado === col.id);
                const styleClass = COLUMN_STYLES[col.id] || 'border-slate-200';
                
                return (
                    <div key={col.id} className="flex h-full w-[320px] min-w-[320px] flex-col flex-shrink-0">
                        
                        {/* Header de Columna Mejorado */}
                        <div className={`mb-4 flex items-center justify-between border-t-4 pt-4 transition-all duration-300 ${styleClass.split(' ')[0]}`}>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">
                                    {col.title}
                                </h3>
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-slate-100 px-1.5 text-xs font-bold text-slate-600">
                                    {columnOrders.length}
                                </span>
                            </div>
                        </div>

                        {/* Cuerpo de la columna (Drop Zone visual) */}
                        <div className={`flex-1 rounded-xl p-3 transition-colors ${styleClass.split(' ')[1] || 'bg-slate-50'}`}>
                            <div className="flex flex-col gap-3">
                                {columnOrders.map((orden) => (
                                    <JobCard 
                                        key={orden.id} 
                                        orden={orden} 
                                        onClick={onCardClick} 
                                    />
                                ))}
                                
                                {/* Estado Vacío Sutil */}
                                {columnOrders.length === 0 && (
                                    <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200/60 text-center">
                                        <span className="text-xs font-medium text-slate-400">Sin órdenes</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}