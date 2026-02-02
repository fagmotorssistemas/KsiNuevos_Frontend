import { 
    Landmark, 
    Banknote, 
    ArrowLeftRight, 
    Layers,
    Clock,
    Calendar,
    CalendarDays,
    CalendarRange,
    History,
    Archive
} from "lucide-react";
import { DateRangePreset, CobroPaymentType } from "./CobrosFilters";

interface WizardProps {
    step: 'TYPE' | 'DATE';
    onSelectType: (type: CobroPaymentType) => void;
    onSelectDate: (date: DateRangePreset) => void;
    onBack: () => void;
}

export function CobrosWizardSelection({ step, onSelectType, onSelectDate, onBack }: WizardProps) {
    
    // Configuración visual de Tipos de Pago
    const paymentTypes = [
        { 
            id: 'ALL', 
            label: 'Ver Todo', 
            icon: Layers, 
            color: 'text-slate-600', 
            bg: 'bg-slate-50', 
            desc: 'Historial completo de recaudación' 
        },
        { 
            id: 'DEPOSITOS', 
            label: 'Depósitos', 
            icon: Landmark, 
            color: 'text-red-600', 
            bg: 'bg-red-50', 
            desc: 'Transferencias y depósitos bancarios' 
        },
        { 
            id: 'EFECTIVO', 
            label: 'Efectivo', 
            icon: Banknote, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50', 
            desc: 'Pagos recibidos en caja' 
        },
        { 
            id: 'CRUCE_CUENTAS', 
            label: 'Cruce de Cuentas', 
            icon: ArrowLeftRight, 
            color: 'text-orange-600', 
            bg: 'bg-orange-50', 
            desc: 'Compensaciones y cruces documentarios' 
        },
    ];

    // Configuración visual de Fechas
    const dates = [
        { id: 'TODAY', label: 'Hoy', icon: Clock, desc: 'Recaudación del día' },
        { id: 'WEEK', label: 'Esta Semana', icon: Calendar, desc: 'Lunes a Domingo actual' },
        { id: 'MONTH', label: 'Este Mes', icon: CalendarDays, desc: 'Mes en curso' },
        { id: 'LAST_MONTH', label: 'Mes Pasado', icon: History, desc: 'Cierre del mes anterior' },
        { id: 'YEAR', label: 'Este Año', icon: CalendarRange, desc: 'Acumulado anual' },
        { id: 'ALL', label: 'Histórico', icon: Archive, desc: 'Todo el tiempo' },
    ];

    if (step === 'TYPE') {
        return (
            <div className="max-w-4xl mx-auto py-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">¿Qué tipo de cobros deseas revisar?</h2>
                    <p className="text-slate-500 text-lg">Selecciona el método de pago para filtrar la cartera.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {paymentTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <button
                                key={type.id}
                                onClick={() => onSelectType(type.id as CobroPaymentType)}
                                className="group flex flex-col items-center p-6 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:shadow-md transition-all text-center"
                            >
                                <div className={`p-4 rounded-full mb-4 ${type.bg} group-hover:scale-110 transition-transform`}>
                                    <Icon className={`h-8 w-8 ${type.color}`} />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-lg mb-1">{type.label}</h3>
                                <p className="text-xs text-slate-500">{type.desc}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Step === DATE
    return (
        <div className="max-w-3xl mx-auto py-12 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-10">
                <button 
                    onClick={onBack}
                    className="text-sm text-slate-400 hover:text-red-600 mb-4 hover:underline transition-all"
                >
                    ← Volver a tipos de pago
                </button>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">¿De qué periodo?</h2>
                <p className="text-slate-500 text-lg">Selecciona el rango de fechas para el análisis.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {dates.map((date) => {
                    const Icon = date.icon;
                    return (
                        <button
                            key={date.id}
                            onClick={() => onSelectDate(date.id as DateRangePreset)}
                            className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50/30 hover:shadow-md transition-all text-left"
                        >
                            <div className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                <Icon className="h-6 w-6 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{date.label}</h3>
                                <p className="text-xs text-slate-500">{date.desc}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}