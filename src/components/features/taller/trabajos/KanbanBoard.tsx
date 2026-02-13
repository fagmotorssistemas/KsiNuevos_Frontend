import React, { useState, useEffect, useMemo } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { OrdenTrabajo } from "@/types/taller";
import { JobCard } from "./JobCard";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TipoEstado = OrdenTrabajo['estado'];

interface KanbanBoardProps {
  ordenes: OrdenTrabajo[];
  onCardClick: (orden: OrdenTrabajo) => void;
  onOrderMove?: (ordenId: string, nuevoEstado: string) => void; 
}

const COLUMNS = [
  { id: 'recepcion', title: 'Recepción' },
  { id: 'en_proceso', title: 'En Proceso' },
  { id: 'terminado', title: 'Terminado' }
];

// --- COMPONENTE INTERNO DE COLUMNA ---
const KanbanColumn = ({ id, title, ordenes, onCardClick }: { id: string, title: string, ordenes: OrdenTrabajo[], onCardClick: (o: OrdenTrabajo) => void }) => {
  const { setNodeRef, isOver } = useSortable({
    id: id,
    data: { type: 'Column', id: id },
    disabled: true
  });
  
  const colors: Record<string, string> = {
    recepcion: 'border-t-slate-400 bg-slate-50',
    en_cola: 'border-t-purple-500 bg-purple-50/30',
    en_proceso: 'border-t-blue-500 bg-blue-50/30',
    terminado: 'border-t-emerald-500 bg-emerald-50/30',
  };
  
  const bgClass = isOver ? 'bg-slate-100 ring-2 ring-blue-400/50' : colors[id] || 'bg-slate-50';
  
  return (
    // CAMBIO 1: Cambiado 'h-full' por 'h-fit' para que la altura dependa del contenido.
    // Mantenemos 'flex-1' para el ancho, pero la altura ahora es dinámica.
    <div className="flex flex-col h-fit flex-1 min-w-[300px] rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-colors">
      {/* Header Columna */}
      <div className={cn("p-4 border-t-4 z-10 sticky top-0 flex justify-between items-center shadow-sm", bgClass)}>
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200">
            {ordenes.length}
          </span>
      </div>
  
      {/* Área Droppable */}
      {/* CAMBIO 2: Eliminado 'overflow-y-auto' y 'flex-1'. Ahora el div crece con el contenido */}
      <div 
        ref={setNodeRef} 
        className={cn("p-3 transition-colors duration-200", isOver ? 'bg-slate-100/80' : 'bg-transparent')}
      >
        <SortableContext 
          id={id} 
          items={ordenes.map(o => o.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3 min-h-[150px]">
            {ordenes.map((orden) => (
              <JobCard key={orden.id} orden={orden} onClick={onCardClick} />
            ))}
            
            {ordenes.length === 0 && !isOver && (
                <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-lg text-slate-300 text-xs">
                    <span>Sin órdenes</span>
                </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function KanbanBoard({ ordenes: initialOrdenes, onCardClick, onOrderMove }: KanbanBoardProps) {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>(initialOrdenes);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStartColumn, setActiveStartColumn] = useState<TipoEstado | null>(null);

  useEffect(() => {
    setOrdenes(initialOrdenes);
  }, [initialOrdenes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- HANDLERS DND ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const currentOrder = ordenes.find(o => o.id === active.id);
    if (currentOrder) {
        setActiveStartColumn(currentOrder.estado);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeOrder = ordenes.find(o => o.id === activeId);
    const overOrder = ordenes.find(o => o.id === overId);
    
    if (!activeOrder) return;

    const activeContainer = activeOrder.estado;
    
    const overContainer = (overOrder 
        ? overOrder.estado 
        : (COLUMNS.find(c => c.id === overId)?.id)) as TipoEstado;

    if (!overContainer || activeContainer === overContainer) return;

    setOrdenes((prev) => {
        const activeIndex = prev.findIndex((o) => o.id === activeId);
        const overIndex = prev.findIndex((o) => o.id === overId);
        
        const newItems = [...prev];
        
        newItems[activeIndex] = { 
            ...newItems[activeIndex], 
            estado: overContainer 
        };

        if (overIndex >= 0) {
            return arrayMove(newItems, activeIndex, overIndex);
        }
        
        return newItems;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) {
        setActiveStartColumn(null);
        return;
    }

    const activeOrder = ordenes.find(o => o.id === active.id);
    const overOrder = ordenes.find(o => o.id === over.id);
    
    const overColumnId = (overOrder 
        ? overOrder.estado 
        : (COLUMNS.find(c => c.id === over.id)?.id)) as TipoEstado;

    if (activeOrder && overColumnId && activeStartColumn && activeStartColumn !== overColumnId) {
       if (onOrderMove) {
           console.log(`Moviendo orden ${activeOrder.id} de ${activeStartColumn} a ${overColumnId}`);
           onOrderMove(activeOrder.id, overColumnId);
       }
    }
    
    setActiveStartColumn(null);
  };

  const activeOrdenData = useMemo(() => ordenes.find(o => o.id === activeId), [activeId, ordenes]);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
  };

  return (
    // CAMBIO 3: Contenedor principal
    // Eliminado 'h-full' estricto en el wrapper si queremos scroll de página, 
    // pero mantenemos 'h-full' con 'overflow-x-auto' si el scroll es horizontal.
    // Lo más importante es 'items-start' en el div interno.
    <div className="flex flex-col h-full w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* CAMBIO 4: Añadido 'items-start' y eliminado 'h-full' para que las columnas
            no se estiren artificialmente. Ahora la altura la define el contenido. */}
        <div className="flex w-full gap-6 items-start overflow-x-auto pb-10 px-4">
          {COLUMNS.map((col) => (
            <KanbanColumn 
              key={col.id} 
              id={col.id} 
              title={col.title} 
              ordenes={ordenes.filter(o => o.estado === col.id)}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeId && activeOrdenData ? (
            <JobCard orden={activeOrdenData} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}