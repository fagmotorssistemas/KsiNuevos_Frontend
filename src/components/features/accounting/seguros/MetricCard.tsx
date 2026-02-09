import { Card } from "@/components/ui/Card";

interface MetricCardProps {
    title: string;
    amount: number;
    count: number;
    unitLabel: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    // Eliminado prop 'color' para forzar diseño de marca
}

export function MetricCard({ title, amount, count, unitLabel, icon, isActive, onClick }: MetricCardProps) {
    
    // Lógica de diseño: Solo blanco y rojo
    const activeClass = isActive 
        ? 'border-l-[#E11D48] bg-white shadow-xl shadow-slate-200/50 -translate-y-1 ring-1 ring-slate-100' 
        : 'border-l-transparent bg-white/50 hover:bg-white hover:shadow-md hover:border-l-slate-200 opacity-80 hover:opacity-100';

    return (
        <button 
            onClick={onClick}
            className={`
                text-left border border-slate-100 border-l-4 p-6 rounded-2xl transition-all duration-300 outline-none w-full
                ${activeClass}
            `}
        >
            <div className="flex justify-between items-start mb-5">
                <div className={`p-3 rounded-xl transition-colors ${isActive ? 'bg-[#E11D48] text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-400'}`}>
                    {icon}
                </div>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {count} {unitLabel}
                </span>
            </div>
            <div>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
                <h3 className="text-3xl font-light text-slate-900 tracking-tight">
                    <span className="font-bold">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </h3>
            </div>
        </button>
    );
}