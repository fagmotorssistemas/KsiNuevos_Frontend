import { ReactNode } from 'react';

interface MetricCardProps {
    title: string;
    unitLabel: string;
    amount: number;
    count: number;
    icon: ReactNode;
    isActive?: boolean;
    onClick?: () => void;
    variant?: 'rose' | 'emerald' | 'blue';
}

export function MetricCard({ 
    title, amount, count, unitLabel, icon, isActive, onClick, variant = 'rose' 
}: MetricCardProps) {
    
    // Configuración visual simple
    const theme = {
        rose: { border: 'border-rose-600', bg: 'bg-[#E11D48]', ring: 'ring-rose-100', text: 'text-rose-600' },
        emerald: { border: 'border-emerald-600', bg: 'bg-emerald-600', ring: 'ring-emerald-100', text: 'text-emerald-600' },
        blue: { border: 'border-blue-600', bg: 'bg-blue-600', ring: 'ring-blue-100', text: 'text-blue-600' }
    }[variant];

    const activeClass = isActive 
        ? `border-l-[6px] ${theme.border} ring-1 ${theme.ring} shadow-xl opacity-100` 
        : "border-l-[6px] border-l-transparent opacity-60 hover:opacity-100";

    return (
        <button 
            onClick={onClick}
            className={`w-full text-left bg-white rounded-[1.5rem] p-7 transition-all duration-300 border border-slate-100 shadow-sm ${activeClass}`}
        >
            <div className="flex items-center gap-5 mb-8">
                <div className={`p-3.5 rounded-2xl shadow-lg flex items-center justify-center text-white ${theme.bg}`}>
                    <div className="scale-125">{icon}</div>
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900">{unitLabel}</h3>
            </div>

            <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">{title}</p>
                <div className="flex items-baseline justify-between mt-1 flex-wrap gap-2">
                    <span className="text-4xl font-black tracking-tighter text-slate-900">
                        ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-medium text-slate-700">{count}</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Items</span>
                    </div>
                </div>
            </div>
        </button>
    );
}