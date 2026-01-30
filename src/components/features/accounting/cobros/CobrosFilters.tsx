import { 
    Search, 
    Calendar, 
    Filter, 
    Tag
} from "lucide-react";

export type DateRangePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface CobrosFilterState {
    searchTerm: string;
    datePreset: DateRangePreset;
    paymentType: string;
}

interface CobrosFiltersProps {
    filters: CobrosFilterState;
    onChange: (newFilters: CobrosFilterState) => void;
    availableTypes: string[]; // Tipos de pago disponibles para el dropdown
}

export function CobrosFilters({ filters, onChange, availableTypes }: CobrosFiltersProps) {

    const handlePresetChange = (preset: DateRangePreset) => {
        onChange({ ...filters, datePreset: preset });
    };

    const presets: { id: DateRangePreset; label: string }[] = [
        { id: 'TODAY', label: 'Hoy' },
        { id: 'WEEK', label: 'Esta Semana' },
        { id: 'MONTH', label: 'Este Mes' },
        { id: 'YEAR', label: 'Este Año' },
        { id: 'ALL', label: 'Todo Histórico' },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 space-y-4">
            
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

                {/* 2. Filtro por Tipo de Pago (Dinámico) */}
                <div className="relative min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        className="block w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 appearance-none bg-white cursor-pointer"
                        value={filters.paymentType}
                        onChange={(e) => onChange({ ...filters, paymentType: e.target.value })}
                    >
                        <option value="ALL">Todos los Tipos</option>
                        {availableTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Filter className="h-3 w-3 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* 3. Accesos Rápidos de Fecha */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mr-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Filtrar periodo:
                </span>
                {presets.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => handlePresetChange(preset.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                            filters.datePreset === preset.id
                                ? 'bg-red-50 border-red-200 text-red-700 font-medium shadow-sm'
                                : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}