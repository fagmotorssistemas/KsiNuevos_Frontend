import { Shield, HeartHandshake, Box } from 'lucide-react';
import { MetricCard } from './MetricCard';

interface MetricsGridProps {
    activeFilter: 'rastreador' | 'seguro' | 'ambos';
    setActiveFilter: (filter: 'rastreador' | 'seguro' | 'ambos') => void;
    metrics: {
        rastreador: { total: number; cant: number };
        seguro: { total: number; cant: number };
        ambos: { total: number; cant: number };
    };
}

export function MetricsGrid({ activeFilter, setActiveFilter, metrics }: MetricsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard 
                title="Recaudación Rastreo" 
                unitLabel="Rastreadores"
                icon={<Shield size={20} />} 
                amount={metrics.rastreador.total} 
                count={metrics.rastreador.cant}
                isActive={activeFilter === 'rastreador'}
                onClick={() => setActiveFilter('rastreador')}
                color="blue"
            />
            <MetricCard 
                title="Recaudación Seguros" 
                unitLabel="Seguros"
                icon={<HeartHandshake size={20} />} 
                amount={metrics.seguro.total} 
                count={metrics.seguro.cant}
                isActive={activeFilter === 'seguro'}
                onClick={() => setActiveFilter('seguro')}
                color="emerald"
            />
            <MetricCard 
                title="Paquetes Completos" 
                unitLabel="Seguros y Rastreadores"
                icon={<Box size={20} />} 
                amount={metrics.ambos.total} 
                count={metrics.ambos.cant}
                isActive={activeFilter === 'ambos'}
                onClick={() => setActiveFilter('ambos')}
                color="indigo"
            />
        </div>
    );
}