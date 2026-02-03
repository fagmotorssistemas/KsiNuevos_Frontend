import { 
    Calendar, 
    CalendarDays, 
    Clock, 
    History, 
    Archive,
    CalendarRange,
    ArrowLeft
} from "lucide-react";

export type DateRangePreset = 'TODAY' | 'WEEK' | 'LAST_WEEK' | 'MONTH' | 'LAST_MONTH' | 'YEAR' | 'ALL';

interface CobrosDateTabsProps {
    current: DateRangePreset;
    onChange: (preset: DateRangePreset) => void;
}

export function CobrosDateTabs({ current, onChange }: CobrosDateTabsProps) {
    
    const presets: { id: DateRangePreset; label: string; icon: any }[] = [
        { id: 'TODAY', label: 'Hoy', icon: Clock },
        { id: 'WEEK', label: 'Esta Semana', icon: Calendar },
        { id: 'LAST_WEEK', label: 'Semana Pasada', icon: ArrowLeft }, 
        { id: 'MONTH', label: 'Este Mes', icon: CalendarDays },
        { id: 'LAST_MONTH', label: 'Mes Pasado', icon: History },
        { id: 'YEAR', label: 'Este Año', icon: CalendarRange },
        { id: 'ALL', label: 'Histórico', icon: Archive },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-1 bg-slate-100/50 rounded-xl border border-slate-200 w-fit">
            {presets.map((preset) => {
                const Icon = preset.icon;
                const isActive = current === preset.id;
                
                return (
                    <button
                        key={preset.id}
                        onClick={() => onChange(preset.id)}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
                            ${isActive 
                                ? 'bg-white text-red-700 shadow-sm ring-1 ring-slate-200' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                            }
                        `}
                    >
                        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                        {preset.label}
                    </button>
                );
            })}
        </div>
    );
}