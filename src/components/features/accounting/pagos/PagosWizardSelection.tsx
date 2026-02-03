import { 
    Car, 
    Wrench, 
    Scale, 
    Lightbulb, 
    Landmark, 
    FileSpreadsheet, 
    History, 
    HelpCircle,
    Archive
} from "lucide-react";
import { GastoCategory } from "./PagosFilters";

interface WizardProps {
    onSelectCategory: (cat: GastoCategory) => void;
}

export function PagosWizardSelection({ onSelectCategory }: WizardProps) {
    
    // Configuración visual de Categorías
    const categories = [
        { id: 'ALL', label: 'Ver Todo', icon: FileSpreadsheet, color: 'text-slate-600', bg: 'bg-slate-50', desc: 'Listado completo sin filtros' },
        { id: 'COMPRA_VEHICULO', label: 'Vehículos', icon: Car, color: 'text-red-600', bg: 'bg-red-50', desc: 'Compras y partes de pago' },
        { id: 'MANTENIMIENTO', label: 'Mantenimiento', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Mecánica y repuestos' },
        { id: 'LEGAL', label: 'Legal', icon: Scale, color: 'text-red-600', bg: 'bg-red-50', desc: 'Notarías y trámites' },
        { id: 'SERVICIOS', label: 'Servicios', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50', desc: 'Luz, internet, oficina' },
        { id: 'FINANCIERO', label: 'Financiero', icon: Landmark, color: 'text-green-600', bg: 'bg-green-50', desc: 'Bancos y nómina' },
        { id: 'CUV', label: 'CUV / Tránsito', icon: History, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Pagos de CUV' },
        { id: 'SALDOS_INICIALES', label: 'Saldos Iniciales', icon: Archive, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Saldos de apertura' },
        { id: 'OTROS', label: 'Otros', icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-50', desc: 'Gastos varios' },
    ];

    return (
        <div className="max-w-6xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">¿Qué pagos deseas revisar?</h2>
                <p className="text-slate-500 text-lg">Selecciona una categoría para acceder al reporte detallado.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 px-4">
                {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id as GastoCategory)}
                            className="group flex flex-col items-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-red-500 hover:shadow-lg transition-all text-center relative overflow-hidden"
                        >
                            <div className={`p-4 rounded-full mb-4 ${cat.bg} group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className={`h-8 w-8 ${cat.color}`} />
                            </div>
                            <h3 className="font-semibold text-slate-900 text-lg mb-1">{cat.label}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{cat.desc}</p>
                            
                            {/* Efecto decorativo */}
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent group-hover:via-red-400 opacity-50 transition-colors" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}