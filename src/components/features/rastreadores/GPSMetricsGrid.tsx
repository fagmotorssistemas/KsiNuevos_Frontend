import { Shield } from 'lucide-react';
import { MetricCard } from './MetricCard';
interface GPSMetricsGridProps {
    metrics: {
        total: number;
        cant: number;
    };
}

export function GPSMetricsGrid({ metrics }: GPSMetricsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard 
                title="Rastreo Satelital" 
                unitLabel="Rastreadores"
                icon={<Shield size={24} />} 
                amount={metrics.total} 
                count={metrics.cant}
                isActive={true} // Siempre activo para que se vea rojo
                onClick={() => {}} // No hace nada
                variant="rose" // Rojo
            />
            {/* Aquí podrías agregar más tarjetas específicas de GPS en el futuro, 
                como "Equipos por Instalar" o "Equipos Activos" */}
        </div>
    );
}