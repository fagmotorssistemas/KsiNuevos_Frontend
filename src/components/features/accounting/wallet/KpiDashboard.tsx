import { 
    DollarSign, 
    AlertTriangle, 
    CheckCircle2, 
    TrendingDown 
} from "lucide-react";
import { KpiCartera } from "@/types/wallet.types";

interface KpiDashboardProps {
    data: KpiCartera | null;
    loading: boolean;
}

export function KpiDashboard({ data, loading }: KpiDashboardProps) {
    // Helper para formatear dinero
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    // Configuración de las tarjetas
    const cards = [
        {
            label: "Total en Cartera",
            value: formatMoney(data.totalCartera),
            subtext: `${data.cantidadClientesConDeuda} clientes con saldo`,
            icon: DollarSign,
            color: "text-slate-900",
            bg: "bg-white",
            border: "border-slate-200"
        },
        {
            label: "Cartera Vencida",
            value: formatMoney(data.carteraVencida),
            subtext: "Requiere gestión inmediata",
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100"
        },
        {
            label: "Cartera Vigente",
            value: formatMoney(data.carteraVigente),
            subtext: "Dentro del plazo",
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100"
        },
        {
            label: "Índice de Morosidad",
            value: `${data.porcentajeMorosidad}%`,
            subtext: "Del total prestado",
            icon: TrendingDown,
            color: data.porcentajeMorosidad > 10 ? "text-red-600" : "text-slate-600",
            bg: "bg-white",
            border: data.porcentajeMorosidad > 10 ? "border-red-200" : "border-slate-200"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, idx) => (
                <div 
                    key={idx} 
                    className={`p-5 rounded-xl border ${card.border} ${card.bg} shadow-sm transition-all hover:shadow-md`}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 rounded-lg ${card.bg === 'bg-white' ? 'bg-slate-50' : 'bg-white bg-opacity-60'}`}>
                            <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        {/* Chip decorativo opcional */}
                        {idx === 1 && (
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
                        <h3 className={`text-2xl font-bold tracking-tight ${card.color}`}>
                            {card.value}
                        </h3>
                        <p className="text-xs text-slate-400 mt-2 font-medium">
                            {card.subtext}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}