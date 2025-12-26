import { useState } from "react";
import { ClientePB } from "@/hooks/contapb/types";
import { User, Phone, MapPin, FileText, ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EditClienteModal } from "./EditClienteModal"; // <--- Importamos el modal

interface ClienteHeaderProps {
  cliente: ClientePB;
  onRefresh?: () => void; // Recibimos la función para recargar
}

export function ClienteHeader({ cliente, onRefresh }: ClienteHeaderProps) {
  // Estado para controlar el modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estilos según calificación
  const getBadgeColor = (calif: string | null) => {
    switch (calif) {
        case 'A': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'D': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'ZNCC': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleUpdateSuccess = () => {
    if (onRefresh) onRefresh(); // Recargamos los datos al guardar
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Info Principal */}
        <div className="flex items-start gap-4">
          <Link 
            href="/contapb" 
            className="mt-1 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
            title="Volver a la lista"
          >
            <ArrowLeft size={20} />
          </Link>

          <div 
             className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md shrink-0"
             style={{ backgroundColor: cliente.color_etiqueta || '#94a3b8' }} 
          >
             {cliente.nombre_completo.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3 flex-wrap">
              {cliente.nombre_completo}
              {cliente.calificacion_cliente && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${getBadgeColor(cliente.calificacion_cliente)}`}>
                  {cliente.calificacion_cliente}
                </span>
              )}
            </h1>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span className="font-mono">{cliente.identificacion || 'Sin ID'}</span>
              </div>
              {cliente.telefono && (
                <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span>{cliente.telefono}</span>
                </div>
              )}
              {cliente.direccion && (
                <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="truncate max-w-xs">{cliente.direccion}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-slate-600"
                onClick={() => setIsEditModalOpen(true)} // <--- Abre el modal
            >
                <Edit size={16} />
                Editar Datos
            </Button>
        </div>
      </div>

      {/* Observaciones Legales */}
      {cliente.observaciones_legales && (
        <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-900 flex gap-3">
            <div className="shrink-0 pt-0.5">⚠️</div>
            <p>{cliente.observaciones_legales}</p>
        </div>
      )}

      {/* Renderizado del Modal */}
      {isEditModalOpen && (
        <EditClienteModal 
            cliente={cliente}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
}