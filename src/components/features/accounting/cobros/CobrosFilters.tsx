import { 
    Search, 
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
}

export function CobrosFilters({ filters, onChange }: CobrosFiltersProps) {

    const paymentTypes: { id: CobroPaymentType; label: string }[] = [
        { id: 'ALL', label: 'Todos los Tipos' },
        { id: 'DEPOSITOS', label: 'Depósitos Bancarios' },
        { id: 'EFECTIVO', label: 'Efectivo / Caja' },
        { id: 'CRUCE_CUENTAS', label: 'Cruce de Cuentas' },
    ];

    return (
        <div className="mb-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
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
                    </div>
                </div>
            </div>
        </div>
    );
}