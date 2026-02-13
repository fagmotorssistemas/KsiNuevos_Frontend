import { Card } from "@/components/ui/Card"; // Mantenemos tu import aunque no se use directamente, por si acaso.

interface MetricCardProps {
    title: string;      // Ej: "Rastreo Satelital" (Ahora será el subtítulo pequeño)
    unitLabel: string;  // Ej: "Rastreadores" (Ahora será el Título Grande)
    amount: number;
    count: number;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    variant?: 'rose' | 'emerald' | 'blue'; // Nuevo prop para el color
}

export function MetricCard({ 
    title, 
    amount, 
    count, 
    unitLabel, 
    icon, 
    isActive, 
    onClick,
    variant = 'rose' // Color por defecto
}: MetricCardProps) {
    
    // Configuración de temas basada en tu diseño
    const themes = {
        rose: {
            border: 'border-rose-600',
            iconBg: 'bg-[#E11D48]',
            iconShadow: 'shadow-rose-200',
            text: 'text-rose-600',
            ring: 'ring-rose-100'
        },
        emerald: {
            border: 'border-emerald-600',
            iconBg: 'bg-emerald-600',
            iconShadow: 'shadow-emerald-200',
            text: 'text-emerald-600',
            ring: 'ring-emerald-100'
        },
        blue: {
            border: 'border-blue-600',
            iconBg: 'bg-blue-600',
            iconShadow: 'shadow-blue-200',
            text: 'text-blue-600',
            ring: 'ring-blue-100'
        }
    };

    const theme = themes[variant];

    return (
        <button 
            onClick={onClick}
            className={`
                relative w-full text-left bg-white rounded-[1.5rem] p-7 transition-all duration-300 outline-none
                border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1
                ${isActive ? `border-l-[6px] ${theme.border} ring-1 ${theme.ring}` : 'border-l-[6px] border-l-transparent opacity-70 hover:opacity-100'}
            `}
        >
            {/* Header: Icono + Título Grande (unitLabel) */}
            <div className="flex items-center gap-5 mb-8">
                <div className={`
                    p-3.5 rounded-2xl shadow-lg flex items-center justify-center text-white transition-all
                    ${isActive ? `${theme.iconBg} ${theme.iconShadow}` : 'bg-slate-100 text-slate-400 shadow-none'}
                `}>
                    {/* Forzamos el tamaño del icono para que se vea como el diseño */}
                    <div className="scale-125">
                        {icon}
                    </div>
                </div>
                
                <h3 className={`text-3xl font-black tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {unitLabel}
                </h3>
            </div>

            {/* Body: Subtítulo + Monto + Resultados */}
            <div className="flex flex-col gap-1">
                {/* Subtítulo (title original) */}
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">
                    {title}
                </p>
                
                <div className="flex items-baseline justify-between mt-1 flex-wrap gap-2">
                    {/* Monto */}
                    <span className={`text-4xl font-black tracking-tighter ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                        ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    
                    {/* Contador */}
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-medium ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                            {count}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                            Resultados
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}