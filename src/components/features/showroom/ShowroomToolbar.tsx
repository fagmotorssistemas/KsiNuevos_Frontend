import { Search, CalendarDays, User } from "lucide-react";

interface ShowroomToolbarProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    dateFilter: string;
    onDateFilterChange: (val: string) => void;
    currentUserRole?: string | null; // Nuevo prop para manejar el rol
    salespersons?: any[]; // Lista de vendedores para el select
    selectedSalesperson: string;
    onSalespersonChange: (val: string) => void;
}

export default function ShowroomToolbar({
    searchTerm, 
    onSearchChange,
    dateFilter, 
    onDateFilterChange,
    currentUserRole,
    salespersons = [],
    selectedSalesperson, 
    onSalespersonChange
}: ShowroomToolbarProps) {

    // Determinamos si es admin basándonos en el rol (igual que en LeadsToolbar)
    const isAdmin = currentUserRole?.toLowerCase() === 'admin';

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
            
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por cliente, auto o marca..." 
                    className="w-full pl-9 pr-4 py-2 rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* Filtro de Fechas */}
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <CalendarDays className="h-4 w-4 text-slate-400 ml-2" />
                    <select 
                        className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1 pr-8"
                        value={dateFilter}
                        onChange={(e) => onDateFilterChange(e.target.value)}
                    >
                        <option value="today">Hoy</option>
                        <option value="yesterday">Ayer</option>
                        <option value="week">Últimos 7 días</option>
                        <option value="month">Este Mes</option>
                        <option value="all">Todo el historial</option>
                    </select>
                </div>

                {/* Filtro de Responsable (Solo visible para Admin) */}
                {isAdmin && (
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <User className="h-4 w-4 text-slate-400 ml-2" />
                        <select 
                            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1 pr-8 max-w-[150px] truncate"
                            value={selectedSalesperson}
                            onChange={(e) => onSalespersonChange(e.target.value)}
                        >
                            <option value="all">Todos los vendedores</option>
                            {salespersons.map(sp => (
                                <option key={sp.id} value={sp.id}>{sp.full_name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}