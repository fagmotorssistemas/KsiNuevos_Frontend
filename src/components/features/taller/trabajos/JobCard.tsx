import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, Clock, AlertTriangle, ChevronRight, GripVertical } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utilidad para clases
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface JobCardProps {
  orden: OrdenTrabajo;
  onClick?: (orden: OrdenTrabajo) => void;
  isOverlay?: boolean;
}

export function JobCard({ orden, onClick, isOverlay }: JobCardProps) {
  // Configuración de dnd-kit
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: orden.id,
    data: {
      type: 'JobCard',
      orden,
    },
    disabled: isOverlay
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // --- LÓGICA VISUAL ---
  const fechaIngreso = new Date(orden.fecha_ingreso);
  const diffTime = Math.abs(new Date().getTime() - fechaIngreso.getTime());
  const diasEnTaller = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const esCritico = diasEnTaller > 15;
  const esAlerta = diasEnTaller > 7 && !esCritico;

  const statusColor = esCritico ? "bg-red-500" : esAlerta ? "bg-amber-500" : "bg-black";
  const badgeClass = esCritico 
    ? "bg-red-50 text-red-700 border-red-100" 
    : esAlerta 
      ? "bg-amber-50 text-amber-700 border-amber-100" 
      : "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-200",
        "hover:shadow-md",
        isDragging && "opacity-30",
        isOverlay && "opacity-100 shadow-2xl scale-105 rotate-2 cursor-grabbing z-50  ",
        !isOverlay && "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners} // CORRECCIÓN: Listeners aplicados al contenedor principal
    >
      {/* Indicador Lateral de Estado */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", statusColor)} />

      {/* Header: Grip + Placa + Orden */}
      <div className="flex justify-between items-start mb-3 pl-2">
        <div className="flex items-center gap-2">
          {/* Grip Handle: Ícono visual */}
          <div className="text-slate-300 hover:text-slate-500 -ml-1 p-0.5">
             <GripVertical className="w-4 h-4" />
          </div>
          
          <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs tracking-wide">
            {orden.vehiculo_placa}
          </span>
          {esCritico && (
            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400">
          #{orden.numero_orden.toString().padStart(4, '0')}
        </span>
      </div>

      {/* Cuerpo Principal */}
      <div className="mb-4 pl-3" onClick={(e) => {
        if(!isDragging) onClick?.(orden);
      }}>
        <h4 className="font-bold text-slate-800 text-sm mb-1 leading-tight flex items-center gap-2">
          {orden.vehiculo_marca} {orden.vehiculo_modelo}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <User className="w-3 h-3" />
          <span className="truncate max-w-[150px]">
            {orden.cliente?.nombre_completo || "Sin cliente"}
          </span>
        </div>
      </div>

      {/* Footer: Métricas y Acción */}
      <div className="flex items-center justify-between border-t border-slate-50 pt-3 pl-3">
        <div className={cn("flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border", badgeClass)}>
          <Clock className="w-3 h-3" />
          <span>{diasEnTaller}d</span>
        </div>
        
        <button 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(orden);
          }}
          className="text-slate-300 hover:text-blue-600 hover:bg-blue-50 p-1 rounded-full transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}