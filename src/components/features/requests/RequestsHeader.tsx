import { Plus } from "lucide-react";

interface RequestsHeaderProps {
    onNewRequest: () => void;
}

export default function RequestsHeader({ onNewRequest }: RequestsHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Pedidos de Vehículos</h1>
                <p className="text-slate-500 text-sm mt-1">Lista de deseos y necesidades de stock para clientes.</p>
            </div>
            <button 
                onClick={onNewRequest}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm active:scale-95"
            >
                <Plus className="h-4 w-4" /> Nuevo Pedido
            </button>
        </div>
    );
}