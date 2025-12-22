import { 
    Calendar, 
    RefreshCw, 
    Download
} from "lucide-react";
import type { AdminDateFilter } from "@/hooks/useAdminStats";
import { Button } from "@/components/ui/buttontable";

interface AdminToolbarProps {
    currentFilter: AdminDateFilter;
    onFilterChange: (filter: AdminDateFilter) => void;
    customDate: string; // Recibimos string
    onCustomDateChange: (date: string) => void; // Setter de string
    onRefresh: () => void;
    isLoading: boolean;
}

export function AdminToolbar({
    currentFilter,
    onFilterChange,
    customDate,
    onCustomDateChange,
    onRefresh,
    isLoading
}: AdminToolbarProps) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Selector de Rangos Rápidos */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                <FilterButton 
                    active={currentFilter === 'today'} 
                    onClick={() => onFilterChange('today')}
                    label="Hoy"
                />
                <FilterButton 
                    active={currentFilter === '7days'} 
                    onClick={() => onFilterChange('7days')}
                    label="Últimos 7 días"
                />
                <FilterButton 
                    active={currentFilter === 'thisMonth'} 
                    onClick={() => onFilterChange('thisMonth')}
                    label="Este Mes"
                />
                <FilterButton 
                    active={currentFilter === 'custom'} 
                    onClick={() => onFilterChange('custom')}
                    label="Día Específico"
                />
            </div>

            {/* Selector de Fecha Única (Solo visible si 'custom' está activo) */}
            {currentFilter === 'custom' && (
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 animate-in fade-in">
                    <span className="text-slate-500 text-xs font-medium pl-1">Seleccionar día:</span>
                    <input 
                        type="date" 
                        value={customDate}
                        onChange={(e) => onCustomDateChange(e.target.value)}
                        className="bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-2 ml-auto">
                <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isLoading ? 'Cargando...' : 'Actualizar'}</span>
                </Button>
            </div>
        </div>
    );
}

// Subcomponente simple para los botones de filtro
function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
            }`}
        >
            {label}
        </button>
    );
}