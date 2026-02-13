import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface InstallationCounterProps {
    date?: string | null; // Acepta la fecha como string (ej: "Cuenca 10/02/2026")
}

export function InstallationCounter({ date }: InstallationCounterProps) {
    
    // --- Lógica de Cálculo ---
    const getStatus = (dateString?: string | null) => {
        if (!dateString) return { 
            text: "Pendiente", 
            color: "bg-slate-100 text-slate-400", 
            icon: AlertCircle 
        };

        // Extraer fecha usando Regex (busca formatos DD/MM/YYYY o YYYY-MM-DD)
        const cleanDate = dateString.match(/(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})/);
        
        if (!cleanDate) return { 
            text: "Fecha Inválida", 
            color: "bg-red-50 text-red-500", 
            icon: AlertCircle 
        };

        const datePart = cleanDate[0];
        let targetDate: Date;

        // Parsear según formato
        if (datePart.includes('/')) {
            const [day, month, year] = datePart.split('/');
            targetDate = new Date(`${year}-${month}-${day}`);
        } else {
            targetDate = new Date(datePart);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // --- Definir Estados ---
        if (diffDays === 0) return { 
            text: "Instalado hoy", 
            color: "bg-emerald-100 text-emerald-700", 
            icon: CheckCircle2 
        };
        if (diffDays === 1) return { 
            text: "Hace 1 día", 
            color: "bg-blue-50 text-blue-600", 
            icon: Clock 
        };
        if (diffDays > 0) return { 
            text: `Hace ${diffDays} días`, 
            color: "bg-slate-100 text-slate-600", 
            icon: Clock 
        };
        
        return { 
            text: "Fecha Futura", 
            color: "bg-amber-50 text-amber-600", 
            icon: AlertCircle 
        };
    };

    const status = getStatus(date);
    const Icon = status.icon;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent ${status.color} transition-colors`}>
            <Icon size={12} strokeWidth={2.5} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
                {status.text}
            </span>
        </div>
    );
}