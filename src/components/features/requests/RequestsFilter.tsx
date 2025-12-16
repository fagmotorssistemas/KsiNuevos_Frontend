interface RequestsFilterProps {
    currentFilter: string;
    onFilterChange: (status: string) => void;
}

export default function RequestsFilter({ currentFilter, onFilterChange }: RequestsFilterProps) {
    const statuses = ['pendiente', 'aprobado', 'comprado', 'rechazado', 'all'];

    return (
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex gap-2 overflow-x-auto">
            {statuses.map(status => (
                <button
                    key={status}
                    onClick={() => onFilterChange(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                        currentFilter === status 
                        ? 'bg-slate-100 text-slate-900 border border-slate-200' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                    }`}
                >
                    {status === 'all' ? 'Todos' : status}
                </button>
            ))}
        </div>
    );
}