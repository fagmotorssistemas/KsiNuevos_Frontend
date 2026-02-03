import { 
    Landmark, 
    Banknote, 
    ArrowLeftRight, 
    Layers
} from "lucide-react";
import { CobroPaymentType } from "./CobrosFilters";

interface WizardProps {
    onSelectType: (type: CobroPaymentType) => void;
}

export function CobrosWizardSelection({ onSelectType }: WizardProps) {
    
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

    return (
        <div className="max-w-5xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">¿Qué cobros deseas gestionar hoy?</h2>
                <p className="text-slate-500 text-lg">Selecciona una categoría para acceder al tablero.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
                {paymentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                        <button
                            key={type.id}
                            onClick={() => onSelectType(type.id as CobroPaymentType)}
                            className="group flex flex-col items-center p-8 bg-white border border-slate-200 rounded-2xl hover:border-red-500 hover:shadow-lg transition-all text-center relative overflow-hidden"
                        >
                            <div className={`p-5 rounded-full mb-5 ${type.bg} group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className={`h-10 w-10 ${type.color}`} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-xl mb-2">{type.label}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{type.desc}</p>
                            
                            {/* Efecto decorativo */}
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent group-hover:via-red-400 opacity-50 transition-colors" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}