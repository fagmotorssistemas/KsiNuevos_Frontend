import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Clock, LucideIcon } from 'lucide-react';

// Tipado del retorno para usarlo seguro en los componentes
export interface InstallationStatus {
    text: string;
    colorClass: string;
    Icon: LucideIcon;
    showWarning: boolean; // Agregado: para el puntito rojo de alerta
    daysDiff: number | null;
}

export function useInstallationStatus(dateString?: string | null): InstallationStatus {
    return useMemo(() => {
        if (!dateString) {
            return { 
                text: "Fecha Pendiente", 
                colorClass: "bg-gray-100 text-gray-400", 
                Icon: AlertCircle, 
                showWarning: false,
                daysDiff: null
            };
        }

        // Regex para detectar YYYY-MM-DD o DD/MM/YYYY
        const cleanDate = dateString.match(/(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (!cleanDate) {
            return { 
                text: "Fecha Inválida", 
                colorClass: "bg-red-50 text-red-400", 
                Icon: AlertCircle, 
                showWarning: false,
                daysDiff: null
            };
        }

        const datePart = cleanDate[0];
        let targetDate: Date;

        // Parseo manual para evitar problemas de zona horaria
        if (datePart.includes('/')) {
            const [day, month, year] = datePart.split('/');
            targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
            const [year, month, day] = datePart.split('-');
            targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Lógica de Alerta (Entre 23 y 30 días - Regla de Negocio Monolito)
        const showWarning = diffDays >= 23 && diffDays <= 30;

        let text = "";
        let colorClass = "";
        let Icon = Clock;

        if (diffDays === 0) {
            text = "Emitido Hoy";
            colorClass = "bg-emerald-100 text-emerald-700";
            Icon = CheckCircle2;
        } else if (diffDays === 1) {
            text = "Hace 1 día";
            colorClass = "bg-blue-50 text-blue-600";
        } else if (diffDays > 0) {
            text = `Hace ${diffDays} días`;
            // Si hay warning, pintamos el fondo ámbar, sino gris normal
            colorClass = showWarning ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
        } else {
            text = "Fecha Futura";
            colorClass = "bg-purple-50 text-purple-600";
            Icon = AlertCircle;
        }

        return { text, colorClass, Icon, showWarning, daysDiff: diffDays };
    }, [dateString]);
}