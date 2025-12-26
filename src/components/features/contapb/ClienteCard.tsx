import { ClientePB } from '../../../hooks/contapb/types';
import { User, Phone, FileText, MapPin, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

interface ClienteCardProps {
    cliente: ClientePB;
    onEdit?: (cliente: ClientePB) => void;
}

export const ClienteCard = ({ cliente, onEdit }: ClienteCardProps) => {

    // Color dinámico según la calificación (o el color personalizado si existe)
    const getStatusColor = (calificacion: string | null) => {
        if (cliente.color_etiqueta) return { bg: `${cliente.color_etiqueta}10`, border: cliente.color_etiqueta, text: 'text-gray-700' };

        switch (calificacion) {
            case 'A': return { bg: 'bg-emerald-50', border: '#10b981', text: 'text-emerald-700' };
            case 'D': return { bg: 'bg-blue-50', border: '#3b82f6', text: 'text-blue-700' };
            case 'ZNCC': return { bg: 'bg-red-50', border: '#ef4444', text: 'text-red-700' };
            default: return { bg: 'bg-white', border: '#e2e8f0', text: 'text-gray-600' };
        }
    };

    const styles = getStatusColor(cliente.calificacion_cliente);

    return (
        <div className={`group rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full bg-white`}
            style={{ borderColor: styles.border }}>

            {/* 1. HEADER (Color + Icono) */}
            <div className={`relative h-24 ${styles.bg} flex items-center justify-center border-b border-gray-100`}>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500">
                    <User size={24} />
                </div>

                {/* Badge de Calificación Flotante
                {cliente.calificacion_cliente && (
                    <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shadow-sm bg-white ${styles.text}`}>
                            {cliente.calificacion_cliente}
                        </span>
                    </div>
                )} */}
            </div>

            {/* 2. INFO (Body) */}
            <div className="p-4 flex flex-col flex-1">
                <div className="mb-3 text-center">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight truncate">
                        {cliente.nombre_completo}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                        {cliente.identificacion || 'SIN ID'}
                    </p>
                </div>

                {/* Detalles Técnicos */}
                <div className="grid grid-cols-1 gap-y-2 my-2 py-3 border-y border-slate-50 text-xs text-slate-600">
                    {cliente.telefono && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cliente.telefono}</span>
                        </div>
                    )}
                    {cliente.direccion && (
                        <div className="flex items-center gap-2 truncate">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{cliente.direccion}</span>
                        </div>
                    )}
                    {cliente.observaciones_legales && (
                        <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate italic text-slate-400">Tiene observaciones...</span>
                        </div>
                    )}
                </div>

                {/* Botones de Acción */}
                <div className="mt-auto flex gap-2 pt-2">
                    <Link
                        href={`/contapb/cliente/${cliente.id}`}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition-colors border border-slate-200 text-center flex items-center justify-center"
                    >
                        Ver Cartera
                    </Link>

                    {/* <button
                        onClick={() => onEdit && onEdit(cliente)}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </button> */}
                </div>
            </div>
        </div>
    );
};