import { OrdenTrabajo } from "@/types/taller"; // <--- Corregido
import { JobCard } from "./JobCard";

interface KanbanBoardProps {
    ordenes: OrdenTrabajo[];
    onCardClick: (orden: OrdenTrabajo) => void;
}

const COLUMNS = [
    { id: 'recepcion', title: 'Recepción', color: 'bg-slate-100 border-slate-200' },
    { id: 'en_cola', title: 'En Cola', color: 'bg-orange-50 border-orange-200' },
    { id: 'en_proceso', title: 'En Proceso', color: 'bg-blue-50 border-blue-200' },
    { id: 'control_calidad', title: 'Calidad', color: 'bg-purple-50 border-purple-200' },
    { id: 'terminado', title: 'Terminado', color: 'bg-emerald-50 border-emerald-200' }
];

export function KanbanBoard({ ordenes, onCardClick }: KanbanBoardProps) {
    return (
        <div className="flex gap-4 overflow-x-auto pb-6 h-full min-h-[500px]">
            {COLUMNS.map((col) => {
                const columnOrders = ordenes.filter(o => o.estado === col.id);
                
                return (
                    <div key={col.id} className="min-w-[280px] w-[300px] flex-shrink-0 flex flex-col">
                        {/* Column Header */}
                        <div className={`p-3 rounded-t-xl border-t border-x ${col.color} border-b-0`}>
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                                    {col.title}
                                </h3>
                                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold text-slate-600">
                                    {columnOrders.length}
                                </span>
                            </div>
                        </div>

                        {/* Column Body */}
                        <div className="bg-slate-50/50 border border-slate-200 rounded-b-xl p-3 flex-1 space-y-3">
                            {columnOrders.map((orden) => (
                                <JobCard 
                                    key={orden.id} 
                                    orden={orden} 
                                    onClick={onCardClick} 
                                />
                            ))}
                            
                            {columnOrders.length === 0 && (
                                <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                                    Sin órdenes
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}