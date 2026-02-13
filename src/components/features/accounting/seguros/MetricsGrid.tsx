import { Shield, ShieldCheck, Package } from 'lucide-react'; // Cambié Box por Package para variar, o usa Box si prefieres
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricCard 
                title="Rastreo Satelital" 
                unitLabel="Rastreadores"
                icon={<Shield size={24} />} 
                amount={metrics.rastreador.total} 
                count={metrics.rastreador.cant}
                isActive={activeFilter === 'rastreador'}
                onClick={() => setActiveFilter('rastreador')}
                variant="rose" // Rojo
            />
            <MetricCard 
                title="Pólizas de Seguro" 
                unitLabel="Seguros"
                icon={<ShieldCheck size={24} />} 
                amount={metrics.seguro.total} 
                count={metrics.seguro.cant}
                isActive={activeFilter === 'seguro'}
                onClick={() => setActiveFilter('seguro')}
                variant="emerald" // Verde
            />
            <MetricCard 
                title="Paquetes Completos" 
                unitLabel="Ambos"
                icon={<Package size={24} />} 
                amount={metrics.ambos.total} 
                count={metrics.ambos.cant}
                isActive={activeFilter === 'ambos'}
                onClick={() => setActiveFilter('ambos')}
                variant="blue" // Azul
            />
        </div>
    );
}