import { ArrowUpDown } from "lucide-react";

export const FilterButton = ({
    label,
    active,
    icon: Icon,
    onClick,
    disabled = false,
    hasSelection = false
}: {
    label: string;
    active: boolean;
    icon: any;
    onClick: () => void;
    disabled?: boolean;
    hasSelection?: boolean
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
                relative w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm 
                border rounded-xl transition-all duration-200 group
                ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100' : 'cursor-pointer hover:shadow-md'}
                ${hasSelection
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
            `}
    >
        <div className="flex items-center gap-2 truncate">
            <Icon className={`h-4 w-4 flex-shrink-0 ${hasSelection ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className={`font-medium truncate ${hasSelection ? 'text-slate-100' : ''}`}>
                {label}
            </span>
        </div>
        {hasSelection ? (
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
        ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpDown className="h-3 w-3 text-slate-300" />
            </div>
        )}
    </button>
);