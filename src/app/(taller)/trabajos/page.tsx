"use client";

import { useState, useMemo } from "react";
import { 
  Loader2, 
  RefreshCw, 
  LayoutDashboard, 
  AlertCircle, 
  CheckCircle2, 
  Clock 
} from "lucide-react";

// Hooks
import { useOrdenes } from "@/hooks/taller/useOrdenes";

// Types
import { OrdenTrabajo } from "@/types/taller";

// Components
// CORRECCIÓN 1: Importación por defecto (sin llaves) para KanbanBoard
import KanbanBoard from "@/components/features/taller/trabajos/KanbanBoard";
import { WorkOrderModal } from "@/components/features/taller/trabajos/WorkOrderModal";
import { OrderPrintView } from "@/components/features/taller/OrderPrintView";

// Componente para las tarjetas de estadísticas
function StatCard({ icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function TrabajosPage() {
  const { ordenes, isLoading, actualizarEstado, refresh } = useOrdenes();
  const [selectedOrder, setSelectedOrder] = useState<OrdenTrabajo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estadísticas rápidas calculadas en tiempo real
  const stats = useMemo(() => {
    if (!ordenes) return { total: 0, criticos: 0, proceso: 0 };
    const hoy = new Date().getTime();
    
    return {
      total: ordenes.length,
      criticos: ordenes.filter(o => {
        // Cálculo seguro de días
        const fechaIngreso = new Date(o.fecha_ingreso).getTime();
        const dias = (hoy - fechaIngreso) / (1000 * 3600 * 24);
        return dias > 15 && o.estado !== 'entregado';
      }).length,
      // CORRECCIÓN 2: Filtrar estados válidos. Asumimos que 'terminado' o 'entregado' son los finales.
      // Si tu tipo usa otros nombres, ajusta 'terminado' aquí.
      proceso: ordenes.filter(o => o.estado !== 'terminado' && o.estado !== 'entregado').length
    };
  }, [ordenes]);

  const handleCardClick = (orden: OrdenTrabajo) => {
    setSelectedOrder(orden);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await actualizarEstado(id, newStatus);
    void handleRefresh(); 
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    // Pequeño timeout para dar feedback visual de carga
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (isLoading) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium">Cargando tablero de control...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 overflow-hidden">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            Control de Taller
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestión visual del flujo de trabajo y estados.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar Tablero'}
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen (Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 flex-shrink-0">
        <StatCard 
          icon={<Clock className="h-5 w-5 text-blue-600" />}
          label="En Proceso"
          value={stats.proceso}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard 
          icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
          label="Retrasados (+15 días)"
          value={stats.criticos}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard 
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Total Activos"
          value={stats.total}
          color="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Área del Tablero (Ocupa el resto del espacio) */}
      <div className="flex-1 overflow-hidden min-h-0 bg-slate-100/50 rounded-xl border border-slate-200 relative">
        <div className="absolute inset-0 overflow-x-auto overflow-y-hidden p-1">
             {/* Pasamos isDragging si lo necesitas, o props adicionales */}
             <KanbanBoard 
                ordenes={ordenes} 
                onCardClick={handleCardClick} 
             />
        </div>
      </div>

      {/* Modales y Utilidades */}
      <WorkOrderModal
        orden={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusChange}
      />

      {/* Vista de impresión oculta en pantalla, visible al imprimir (Ctrl+P) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
        {selectedOrder && <OrderPrintView orden={selectedOrder} />}
      </div>
    </div>
  );
}