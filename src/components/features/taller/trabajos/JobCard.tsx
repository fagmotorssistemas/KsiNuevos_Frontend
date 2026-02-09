import { Calendar, User, Clock, AlertTriangle, ChevronRight, Car } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface JobCardProps {
  orden: OrdenTrabajo;
  onClick: (orden: OrdenTrabajo) => void;
  isDragging?: boolean; // Prop opcional por si se usa en dnd-kit o similar
}

export function JobCard({ orden, onClick, isDragging }: JobCardProps) {
  // Cálculo de días (seguro contra fechas futuras o nulas)
  const fechaIngreso = new Date(orden.fecha_ingreso);
  const hoy = new Date();
  const diffTime = Math.abs(hoy.getTime() - fechaIngreso.getTime());
  const diasEnTaller = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Determinar severidad
  const esCritico = diasEnTaller > 15;
  const esAlerta = diasEnTaller > 7 && !esCritico;

  // Clases dinámicas según estado
  let statusColor = "bg-blue-500";
  let borderColor = "border-slate-200 hover:border-blue-300";
  let daysColor = "text-slate-500";
  let daysBg = "bg-slate-100";

  if (esCritico) {
    statusColor = "bg-red-500";
    borderColor = "border-red-200 hover:border-red-400";
    daysColor = "text-red-700";
    daysBg = "bg-red-50";
  } else if (esAlerta) {
    statusColor = "bg-amber-500";
    borderColor = "border-amber-200 hover:border-amber-400";
    daysColor = "text-amber-700";
    daysBg = "bg-amber-50";
  }

  return (
    <div
      onClick={() => onClick(orden)}
      role="button"
      tabIndex={0}
      className={`
        relative bg-white p-4 rounded-xl border shadow-sm transition-all duration-200
        group cursor-pointer overflow-hidden
        ${borderColor}
        ${isDragging ? "shadow-2xl rotate-2 scale-105 z-50" : "hover:shadow-md hover:-translate-y-0.5"}
      `}
    >
      {/* Indicador lateral de estado */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusColor}`} />

      {/* Cabecera: Placa y #Orden */}
      <div className="flex justify-between items-start mb-3 pl-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs tracking-wide">
            {orden.vehiculo_placa}
          </span>
          {esCritico && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              CRÍTICO
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-slate-400">
          #{orden.numero_orden.toString().padStart(4, '0')}
        </span>
      </div>

      {/* Cuerpo: Vehículo */}
      <div className="mb-3 pl-2">
        <div className="flex items-center gap-1.5 text-slate-800 mb-1">
          <Car className="w-4 h-4 text-slate-400" />
          <h4 className="font-bold text-sm truncate">
            {orden.vehiculo_marca} {orden.vehiculo_modelo}
          </h4>
        </div>
        
        {/* Cliente */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-0.5">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[140px]">
            {orden.cliente?.nombre_completo || "Cliente desconocido"}
          </span>
        </div>
      </div>

      {/* Pie: Tiempo y Acción */}
      <div className="flex items-center justify-between border-t border-slate-50 pt-3 pl-2 mt-2">
        <div 
          className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md ${daysBg} ${daysColor}`}
          title={`Ingresado el ${fechaIngreso.toLocaleDateString()}`}
        >
          {esCritico || esAlerta ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          <span>{diasEnTaller} {diasEnTaller === 1 ? 'día' : 'días'}</span>
        </div>

        <div className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}