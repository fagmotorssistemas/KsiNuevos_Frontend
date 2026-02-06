import { Card } from "@/components/ui/Card";

interface MetricCardProps {
    title: string;
    amount: number;
    count: number;
    unitLabel: string; // Nueva prop para la etiqueta (ej: "Rastreadores")
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    color: 'blue' | 'emerald' | 'indigo';
}

export function MetricCard({ title, amount, count, unitLabel, icon, isActive, onClick, color }: MetricCardProps) {
    const colorStyles = {
        blue: isActive ? 'border-l-blue-500 shadow-blue-100' : 'hover:border-blue-200',
        emerald: isActive ? 'border-l-emerald-500 shadow-emerald-100' : 'hover:border-emerald-200',
        indigo: isActive ? 'border-l-indigo-500 shadow-indigo-100' : 'hover:border-indigo-200',
    };

    return (
        <button 
            onClick={onClick}
            className={`text-left bg-white border border-slate-200 border-l-4 p-5 rounded-xl transition-all duration-300 outline-none w-full
                ${isActive ? `shadow-xl -translate-y-1 ${colorStyles[color]}` : `opacity-70 hover:opacity-100 ${colorStyles[color]}`}
            `}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {icon}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isActive ? 'bg-slate-100 text-slate-800' : 'text-slate-400 uppercase'}`}>
                    {count} {unitLabel}
                </span>
            </div>
            <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                    ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
            </div>
        </button>
    );
}