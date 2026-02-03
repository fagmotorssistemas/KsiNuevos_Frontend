import { 
    Search, 
    Filter, 
    Tag
} from "lucide-react";

export type CobroPaymentType = 'ALL' | 'DEPOSITOS' | 'EFECTIVO' | 'CRUCE_CUENTAS';

export interface CobrosFilterState {
    searchTerm: string;
    // datePreset se maneja externamente ahora
    paymentType: CobroPaymentType;
}

interface CobrosFiltersProps {
    filters: CobrosFilterState;
    onChange: (newFilters: CobrosFilterState) => void;
    isVisible: boolean; 
    onToggle: () => void;
}

export function CobrosFilters({ filters, onChange, isVisible, onToggle }: CobrosFiltersProps) {

    const paymentTypes: { id: CobroPaymentType; label: string }[] = [
        { id: 'ALL', label: 'Todos los Tipos' },
        { id: 'DEPOSITOS', label: 'Depósitos Bancarios' },
        { id: 'EFECTIVO', label: 'Efectivo / Caja' },
        { id: 'CRUCE_CUENTAS', label: 'Cruce de Cuentas' },
    ];

    return (
        <div className="mb-6">
            <button 
                onClick={onToggle}
                className="flex items-center gap-2 text-sm font-medium text-red-600 mb-3 hover:text-red-700 transition-colors"
            >
                <Filter className="h-4 w-4" />
                {isVisible ? 'Ocultar Filtros Avanzados' : 'Búsqueda y Filtros Avanzados'}
            </button>

            {isVisible && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        
                        {/* 1. Buscador Universal */}
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar cliente, placa, comprobante o concepto..."
                                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                                value={filters.searchTerm}
                                onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
                            />
                        </div>

                        {/* 2. Filtro por Tipo de Pago (Redundancia útil para cambiar sin salir) */}
                        <div className="relative min-w-[220px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Tag className="h-4 w-4 text-slate-400" />
                            </div>
                            <select
                                className="block w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 appearance-none bg-white cursor-pointer"
                                value={filters.paymentType}
                                onChange={(e) => onChange({ ...filters, paymentType: e.target.value as CobroPaymentType })}
                            >
                                {paymentTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <Filter className="h-3 w-3 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}