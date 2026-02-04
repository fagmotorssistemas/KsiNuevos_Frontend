import { Database } from "@/types/supabase";
import { scraperService, VehicleWithSeller } from "@/services/scraper.service";
import { useEffect, useMemo, useState } from "react";
import {
    Car,
    TrendingUp,
    MapPin,
    DatabaseBackup,
    Store,
    Calendar,
    ExternalLink,
    Eye,
    Filter,
    X,
    ChevronRight,
    Search,
    DatabaseZap
} from "lucide-react";
import { useScraperData } from "@/hooks/useScraperData";

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];

interface OpportunitiesViewProps {
    vehicles: VehicleWithSeller[];
    topOpportunities: VehicleWithSeller[];
    sellers: ScraperSeller[];
    isLoading: boolean;
    statusFilter?: string;
    locationFilter?: string;
    stats: {
        total: number;
        nuevos: number;
        descartados: number;
        vendidos: number;
        enMantenimiento: number;
        enPatio: number;
        enTaller: number;
        enCliente: number;
    };
}

export function OpportunitiesView({
    vehicles,
    sellers,
    stats: initialStats,
    isLoading,
    statusFilter,
    locationFilter,
    topOpportunities
}: OpportunitiesViewProps) {

    // Estado para controlar el filtro de Guayaquil
    const [onlyCoast, setOnlyCoast] = useState(true);
    const [showTopDeals, setShowTopDeals] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isWebhookLoading, setIsWebhookLoading] = useState(false);

    const { refreshTopOpportunities } = useScraperData()


    const sourceVehicles = showTopDeals ? topOpportunities : vehicles;
    const regex = /\b(?:babahoyo|milagro|naranjal|daule|los lojas|eloy alfaro|la troncal|el triunfo|guayaquil|esmeraldas|portoviejo|santo\s+domingo|santa\s+elena|machala|manta)\b/i;

    const filteredVehicles = useMemo(() => {
        return sourceVehicles.filter(vehicle => {
            if (!onlyCoast) return true;

            const sellerLocation = vehicle.seller?.location?.toLowerCase() || '';

            return !regex.test(sellerLocation);
        });
    }, [sourceVehicles, onlyCoast]);


    const displayStats = useMemo(() => {
        return {
            total: filteredVehicles.length,
            enPatio: filteredVehicles.filter(v => v.location === 'patio').length,
            enTaller: filteredVehicles.filter(v => v.location === 'taller').length,
            enCliente: filteredVehicles.filter(v => v.location === 'cliente').length,
        };
    }, [filteredVehicles]);

    const displaySellers = useMemo(() => {
        if (!onlyCoast) return sellers;
        return sellers.filter(s => !regex.test(s.location?.toLowerCase() || ''));
    }, [sellers, onlyCoast]);

    const dealersCount = displaySellers.filter(s => s.is_dealer).length;

    const newestVehicle = useMemo(() => {
        if (filteredVehicles.length === 0) return null;
        return filteredVehicles.reduce((prev, current) => {
            const prevDate = new Date(prev.created_at || 0).getTime();
            const currentDate = new Date(current.created_at || 0).getTime();
            return currentDate > prevDate ? current : prev;
        });
    }, [filteredVehicles]);

    const handleSubmitScraper = async (searchValue: string) => {
        setIsWebhookLoading(true);
        const webhook = await scraperService.scrapMarketplace(searchValue);
        setIsWebhookLoading(webhook?.status === 'done' ? false : true);
    }

useEffect(() => {
    if (!isWebhookLoading) {
        refreshTopOpportunities();
    }
}, [isWebhookLoading]);
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium animate-pulse">Analizando vehículos del scraper...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Header con Switch de Filtro */}
            <div className="flex flex-col md:flex-row w-full justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 w-full justify-between">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar vehículo"
                            className="pl-9 pr-4 py-2 text-md h-full rounded-lg focus:outline-none w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        disabled={isWebhookLoading}
                        onClick={() => handleSubmitScraper(searchTerm)}
                        className={`flex items-center gap-2 px-4 py-2 disabled:opacity-50 rounded-lg text-xs font-bold transition-all border w-fit whitespace-nowrap ${onlyCoast
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <DatabaseZap className="h-3.5 w-3.5" />
                        <p>Scrapear Datos</p>
                    </button>
                </div>

            </div>

            {/* Tarjetas Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <DatabaseBackup className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            Total {onlyCoast ? '(costa)' : '(Global)'}
                        </span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{displayStats.total}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Store className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            Vendedores {onlyCoast ? '(costa)' : '(Global)'}
                        </span>
                    </div>
                    <div className="flex gap-2 items-end">
                        <span className="text-2xl font-bold text-slate-900">{displaySellers.length}</span>
                        <p className="text-xs text-slate-500 mt-1">Revendedores: {dealersCount}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Más Reciente</span>
                        {newestVehicle ? (
                            <div>
                                <div className="font-bold text-slate-900 text-sm truncate w-48" title={newestVehicle.title || ''}>
                                    {newestVehicle.title || 'Sin título'}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(newestVehicle.created_at || '').toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ) : <span className="text-slate-400 italic text-sm">Sin datos</span>}
                    </div>
                    {newestVehicle && (
                        <div className="text-right relative z-10">
                            <span className="block text-xl font-bold text-blue-600">
                                {newestVehicle.price ? `$${(newestVehicle.price / 1000).toFixed(0)}k` : 'N/A'}
                            </span>
                            <span className="block text-[10px] text-blue-400 font-medium uppercase tracking-wide">
                                {newestVehicle.status}
                            </span>
                        </div>
                    )}
                    <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-50 to-transparent opacity-50 pointer-events-none" />
                </div>
            </div>
            {/* Sub-filtros de ubicación de inventario */}
            <div className="flex items-center gap-2 text-sm flex-wrap justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                        Patio: <strong className="text-slate-700">{displayStats.enPatio}</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                        Taller: <strong className="text-slate-700">{displayStats.enTaller}</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                        Cliente: <strong className="text-slate-700">{displayStats.enCliente}</strong>
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowTopDeals(!showTopDeals)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm
                        ${showTopDeals
                                ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        {showTopDeals ? "Ver todos los vehículos" : "🔥 Mejores oportunidades"}
                    </button>
                    <button
                        onClick={() => setOnlyCoast(!onlyCoast)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${onlyCoast
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {onlyCoast ? (
                            <><X className="h-3.5 w-3.5" />Mostrar todas las ubicaciones</>
                        ) : (
                            <><Filter className="h-3.5 w-3.5" /> Excluir region de la cosa</>
                        )}
                    </button>
                </div>
            </div>
            {showTopDeals && (
                <div className="px-4 py-2 bg-orange-50 border-b border-orange-200 text-orange-700 text-xs font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Mostrando Top 30 Mejores Oportunidades de Compra
                </div>
            )}

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredVehicles.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-3">
                            <Car className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="font-medium">No se encontraron vehículos</p>
                        <p className="text-sm text-slate-400">Prueba quitando el filtro de ubicación o cambiando los criterios.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="py-3 px-4">Vehículo</th>
                                    <th className="py-3 px-4">Precio</th>
                                    <th className="py-3 px-4">Descripción</th>
                                    <th className="py-3 px-4 text-center">Ubicación Vendedor</th>
                                    <th className="py-3 px-4 text-center">Kilometraje</th>
                                    <th className="py-3 px-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-14 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 border border-slate-200 relative flex items-center justify-center">
                                                    {vehicle.image_url ? (
                                                        <img
                                                            src={vehicle.image_url}
                                                            alt={vehicle.title || 'Vehículo'}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <Car className="h-5 w-5 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-slate-900 truncate max-w-[180px]" title={vehicle.title || ''}>
                                                        {vehicle.title || 'Sin título'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-semibold">
                                                {vehicle.price ? `$${vehicle.price.toLocaleString()}` : 'Precio N/A'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="text-xs text-slate-600 line-clamp-2 max-w-xs" title={vehicle.description || ''}>
                                                {vehicle.description || <span className="italic text-slate-400">Sin descripción</span>}
                                            </p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                                                <MapPin className="h-3 w-3" />
                                                {vehicle.seller?.location || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-700 font-medium">
                                            {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button className="text-blue-600 hover:text-slate-800 hover:cursor-pointer transition-colors" title="Ver detalle">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {vehicle.url && (
                                                    <a
                                                        href={vehicle.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-slate -800 transition-colors"
                                                        title="Ver fuente original"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}