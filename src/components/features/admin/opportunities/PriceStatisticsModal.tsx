import { Database } from "@/types/supabase";
import { Search, X, TrendingUp, TrendingDown, DollarSign, BarChart3, Package } from "lucide-react";
import { useState, useMemo } from "react";

export type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

interface PriceStatisticsModalProps {
    priceStatistics: PriceStatistics[];
    isOpen: boolean;
    onClose: () => void;
}

export function PriceStatisticsModal({
    priceStatistics,
    isOpen,
    onClose,
}: PriceStatisticsModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

    // Obtener todas las marcas únicas
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        priceStatistics.forEach(stat => {
            if (stat.brand) brands.add(stat.brand);
        });
        return Array.from(brands).sort();
    }, [priceStatistics]);

    // Filtrar estadísticas por búsqueda
    const filteredStats = useMemo(() => {
        if (selectedBrand) {
            // Si hay marca seleccionada, mostrar modelos de esa marca
            return priceStatistics
                .filter(stat =>
                    stat.brand === selectedBrand &&
                    (stat.model?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
                )
                .sort((a, b) => (a.model || '').localeCompare(b.model || ''));
        } else {
            // Mostrar marcas
            const brandStats = availableBrands
                .filter(brand => brand.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(brand => {
                    const stats = priceStatistics.filter(s => s.brand === brand && s.year !== null);
                    const totalModels = new Set(stats.map(s => s.model)).size;
                    const avgPrice = stats.length > 0
                        ? stats.reduce((sum, s) => sum + Number(s.avg_price || 0), 0) / stats.length
                        : 0;

                    return {
                        brand,
                        totalModels,
                        avgPrice,
                    };
                });
            return brandStats;
        }
    }, [priceStatistics, selectedBrand, searchTerm, availableBrands]);

    // Estadísticas por modelo-año cuando se selecciona una marca
    const modelYearStats = useMemo(() => {
        if (!selectedBrand) return [];

        const stats = priceStatistics.filter(stat =>
            stat.brand === selectedBrand &&
            (stat.model?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        );

        // Agrupar por modelo
        const grouped = stats.reduce((acc, stat) => {
            const model = stat.model || 'Sin modelo';
            if (!acc[model]) {
                acc[model] = [];
            }
            acc[model].push(stat);
            return acc;
        }, {} as Record<string, PriceStatistics[]>);

        return Object.entries(grouped).map(([model, modelStats]) => ({
            model,
            stats: modelStats.sort((a, b) => {
                // Ordenar por año descendente, NULL al final
                if (a.year === null) return 1;
                if (b.year === null) return -1;
                return Number(b.year) - Number(a.year);
            })
        }));
    }, [priceStatistics, selectedBrand, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">

                {/* HEADER */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Estadísticas de Mercado</h3>
                            <p className="text-sm text-slate-500">
                                {selectedBrand
                                    ? `Análisis de precios para ${selectedBrand}`
                                    : `${availableBrands.length} marcas con datos disponibles`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setSelectedBrand(null);
                            setSearchTerm("");
                        }}
                        className="p-3 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                {/* BARRA DE BÚSQUEDA */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={selectedBrand ? `Buscar modelo de ${selectedBrand}...` : "Buscar marca (Ej: Toyota, Kia...)"}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTENIDO SCROLLABLE */}
                <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                    {!selectedBrand ? (
                        /* VISTA DE MARCAS */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStats.map((brand: any) => (
                                <button
                                    key={brand.brand}
                                    onClick={() => {
                                        setSelectedBrand(brand.brand);
                                        setSearchTerm("");
                                    }}
                                    className="p-6 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100 transition-all active:scale-95 text-left group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {brand.brand.toUpperCase()}
                                        </h3>
                                        <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                            <Package className="h-4 w-4 text-blue-600" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 font-medium">Modelos</span>
                                            <span className="font-bold text-slate-900">{brand.totalModels}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 font-medium">Precio Prom.</span>
                                            <span className="font-bold text-blue-600">
                                                ${Math.round(brand.avgPrice).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 font-medium">Anuncios</span>
                                            <span className="font-bold text-slate-700">{brand.totalListings}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* VISTA DE MODELOS */
                        <div className="space-y-6">
                            <button
                                onClick={() => {
                                    setSelectedBrand(null);
                                    setSearchTerm("");
                                }}
                                className="flex items-center gap-2 text-xs font-bold text-blue-500 hover:underline"
                            >
                                ← VOLVER A MARCAS
                            </button>

                            <div className="space-y-6">
                                {modelYearStats.map(({ model, stats }) => (
                                    <div key={model} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                        <h4 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                            {model.toUpperCase()}
                                            <span className="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded-lg">
                                                {stats.length} {stats.length === 1 ? 'año' : 'años'}
                                            </span>
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {stats.map((stat) => (
                                                <div
                                                    key={stat.id}
                                                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                                                            {stat.year || 'General'}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {/* Precio Sugerido (Mediana) */}
                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-1.5 text-blue-600">
                                                                <DollarSign className="h-3 w-3" />
                                                                <span className="font-semibold">Sugerido</span>
                                                            </div>
                                                            <span className="font-black text-blue-700">
                                                                ${stat.median_price ? Number(stat.median_price).toLocaleString() : 'N/A'}
                                                            </span>
                                                        </div>

                                                        {/* Rango de precios */}
                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-1.5 text-green-600">
                                                                <TrendingDown className="h-3 w-3" />
                                                                <span className="font-semibold">Mínimo</span>
                                                            </div>
                                                            <span className="font-bold text-green-700">
                                                                ${stat.min_price ? Number(stat.min_price).toLocaleString() : 'N/A'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-1.5 text-red-600">
                                                                <TrendingUp className="h-3 w-3" />
                                                                <span className="font-semibold">Máximo</span>
                                                            </div>
                                                            <span className="font-bold text-red-700">
                                                                ${stat.max_price ? Number(stat.max_price).toLocaleString() : 'N/A'}
                                                            </span>
                                                        </div>

                                                        {/* Promedio */}
                                                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                                            <span className="text-slate-500 font-semibold">Promedio</span>
                                                            <span className="font-bold text-slate-900">
                                                                ${stat.avg_price ? Number(stat.avg_price).toLocaleString() : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Mensaje si no hay resultados */}
                                {modelYearStats.length === 0 && (
                                    <div className="py-12 text-center text-slate-400">
                                        <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p>No se encontraron modelos que coincidan con "{searchTerm}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mensaje si no hay marcas */}
                    {!selectedBrand && filteredStats.length === 0 && (
                        <div className="py-12 text-center text-slate-400">
                            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron marcas que coincidan con "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}