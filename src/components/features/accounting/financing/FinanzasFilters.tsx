import { 
    Search, 
    Calendar, 
    Filter, 
    X,
    ArrowUpCircle,
    ArrowDownCircle
} from "lucide-react";

export type DateRangePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type MovementType = 'ALL' | 'INGRESO' | 'EGRESO';

export interface FilterState {
    searchTerm: string;
    type: MovementType;
    datePreset: DateRangePreset;
}

interface FinanzasFiltersProps {
    filters: FilterState;
    onChange: (newFilters: FilterState) => void;
}

export function FinanzasFilters({ filters, onChange }: FinanzasFiltersProps) {

    const handlePresetChange = (preset: DateRangePreset) => {
        onChange({ ...filters, datePreset: preset });
    };

    const handleTypeChange = (type: MovementType) => {
        onChange({ ...filters, type });
    };

    const presets: { id: DateRangePreset; label: string }[] = [
        { id: 'TODAY', label: 'Hoy' },
        { id: 'WEEK', label: 'Esta Semana' },
        { id: 'MONTH', label: 'Este Mes' },
        { id: 'YEAR', label: 'Este Año' },
        { id: 'ALL', label: 'Todo' },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 space-y-4">
            
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                
                {/* 1. Buscador de Texto */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por concepto, beneficiario o documento..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                        value={filters.searchTerm}
                        onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
                    />
                </div>

                {/* 2. Filtro de Tipo (Ingreso/Egreso) */}
                <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                    <button
                        onClick={() => handleTypeChange('ALL')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            filters.type === 'ALL' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => handleTypeChange('INGRESO')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                            filters.type === 'INGRESO' 
                                ? 'bg-white text-emerald-600 shadow-sm' 
                                : 'text-slate-500 hover:text-emerald-600'
                        }`}
                    >
                        <ArrowUpCircle className="h-3 w-3" /> Ingresos
                    </button>
                    <button
                        onClick={() => handleTypeChange('EGRESO')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                            filters.type === 'EGRESO' 
                                ? 'bg-white text-red-600 shadow-sm' 
                                : 'text-slate-500 hover:text-red-600'
                        }`}
                    >
                        <ArrowDownCircle className="h-3 w-3" /> Egresos
                    </button>
                </div>
            </div>

            {/* 3. Filtros de Fecha (Presets) */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mr-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Periodo:
                </span>
                {presets.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => handlePresetChange(preset.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            filters.datePreset === preset.id
                                ? 'bg-red-50 border-red-200 text-red-700 font-medium'
                                : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}