import { 
    Car, 
    Wrench, 
    Scale, 
    Lightbulb, 
    Landmark, 
    FileSpreadsheet, 
    History, 
    HelpCircle,
    Calendar,
    Clock,
    CalendarDays,
    CalendarRange,
    Archive
} from "lucide-react";
import { GastoCategory, DateRangePreset } from "./PagosFilters";

interface WizardProps {
    step: 'CATEGORY' | 'DATE';
    onSelectCategory: (cat: GastoCategory) => void;
    onSelectDate: (date: DateRangePreset) => void;
    onBack: () => void;
}

export function PagosWizardSelection({ step, onSelectCategory, onSelectDate, onBack }: WizardProps) {
    
    // Configuración visual de Categorías
    const categories = [
        { id: 'ALL', label: 'Ver Todo', icon: FileSpreadsheet, color: 'text-slate-600', bg: 'bg-slate-50', desc: 'Listado completo sin filtros' },
        { id: 'COMPRA_VEHICULO', label: 'Vehículos', icon: Car, color: 'text-red-600', bg: 'bg-red-50', desc: 'Compras y partes de pago' },
        { id: 'MANTENIMIENTO', label: 'Mantenimiento', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Mecánica, latonería y repuestos' },
        { id: 'LEGAL', label: 'Legal', icon: Scale, color: 'text-red-600', bg: 'bg-red-50', desc: 'Notarías y trámites' },
        { id: 'SERVICIOS', label: 'Servicios', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50', desc: 'Luz, internet, oficina' },
        { id: 'FINANCIERO', label: 'Financiero', icon: Landmark, color: 'text-green-600', bg: 'bg-green-50', desc: 'Bancos, préstamos y nómina' },
        { id: 'CUV', label: 'CUV / Tránsito', icon: History, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Pagos de CUV' },
        { id: 'SALDOS_INICIALES', label: 'Saldos Iniciales', icon: Archive, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Saldos de apertura' },
        { id: 'OTROS', label: 'Otros', icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-50', desc: 'Gastos varios' },
    ];

    // Configuración visual de Fechas
    const dates = [
        { id: 'TODAY', label: 'Hoy', icon: Clock, desc: 'Movimientos del día' },
        { id: 'WEEK', label: 'Esta Semana', icon: Calendar, desc: 'Lunes a Domingo actual' },
        { id: 'MONTH', label: 'Este Mes', icon: CalendarDays, desc: 'Mes en curso' },
        { id: 'LAST_MONTH', label: 'Mes Pasado', icon: History, desc: 'Cierre del mes anterior' }, // Nuevo
        { id: 'YEAR', label: 'Este Año', icon: CalendarRange, desc: 'Acumulado anual' },
        { id: 'ALL', label: 'Histórico', icon: Archive, desc: 'Todo el tiempo' },
    ];

    if (step === 'CATEGORY') {
        return (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">¿Qué tipo de pagos deseas revisar?</h2>
                    <p className="text-slate-500 text-lg">Selecciona una categoría para comenzar a filtrar.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id as GastoCategory)}
                                className="group flex flex-col items-center p-6 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:shadow-md transition-all text-center"
                            >
                                <div className={`p-4 rounded-full mb-4 ${cat.bg} group-hover:scale-110 transition-transform`}>
                                    <Icon className={`h-8 w-8 ${cat.color}`} />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-lg mb-1">{cat.label}</h3>
                                <p className="text-xs text-slate-500">{cat.desc}</p>
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
                    className="text-sm text-slate-400 hover:text-red-600 mb-4 hover:underline"
                >
                    ← Volver a categorías
                </button>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">¿De qué periodo?</h2>
                <p className="text-slate-500 text-lg">Selecciona el rango de fechas para la búsqueda.</p>
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