import { Database } from "@/types/supabase";
import { TextFormatter } from "@/utils/TextFormatter";
import { Search, X, TrendingUp, TrendingDown, DollarSign, BarChart3, Package, ChevronRight, Activity, Gauge, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import type { PriceStatistics, PriceStatisticsModalProps } from "./interfaces";

export function PriceStatisticsModal({
    priceStatistics,
    isOpen,
    onClose,
}: PriceStatisticsModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

    // --- LOGICA ORIGINAL INTACTA ---
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        priceStatistics.forEach(stat => {
            if (stat.brand) brands.add(stat.brand);
        });
        return Array.from(brands).sort();
    }, [priceStatistics]);

    const filteredStats = useMemo(() => {
        if (selectedBrand) {
            return priceStatistics
                .filter(stat =>
                    stat.brand === selectedBrand &&
                    (stat.model?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
                )
                .sort((a, b) => (a.model || '').localeCompare(b.model || ''));
        } else {
            const brandStats = availableBrands
                .filter(brand => brand.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(brand => {
                    const stats = priceStatistics.filter(s => s.brand === brand);
                    const totalModels = new Set(stats.map(s => s.model)).size;
                    const totalYears = stats.filter(s => s.year !== null).length;
                    const avgPrice = stats.length > 0
                        ? stats.reduce((sum, s) => sum + Number(s.median_price || s.avg_price || 0), 0) / stats.length
                        : 0;
                    const minPrice = Math.min(...stats.map(s => Number(s.min_price || 0)).filter(p => p > 0));
                    const maxPrice = Math.max(...stats.map(s => Number(s.max_price || 0)));

                    return {
                        brand,
                        totalModels,
                        totalYears,
                        avgPrice,
                        minPrice,
                        maxPrice,
                    };
                });
            return brandStats;
        }
    }, [priceStatistics, selectedBrand, searchTerm, availableBrands]);

    const modelYearStats = useMemo(() => {
        if (!selectedBrand) return [];

        const stats = priceStatistics.filter(stat =>
            stat.brand === selectedBrand &&
            (stat.model?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        );

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
                if (a.year === null) return 1;
                if (b.year === null) return -1;
                return Number(b.year) - Number(a.year);
            })
        }));
    }, [priceStatistics, selectedBrand, searchTerm]);
    // --- FIN LOGICA ORIGINAL ---

    if (!isOpen) return null;

    const textFormatter = new TextFormatter()

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-7xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 ring-1 ring-white/20">

                {/* HEADER MEJORADO */}
                <div className="relative px-8 py-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                                <BarChart3 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {selectedBrand ? selectedBrand.toUpperCase() : 'Inteligencia de Mercado'}
                                </h3>
                                <p className="text-sm font-medium text-slate-500">
                                    {selectedBrand
                                        ? `Análisis de precios por modelo y año`
                                        : `Base de datos: ${availableBrands.length} marcas • ${priceStatistics.length} registros analizados`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                onClose();
                                setSelectedBrand(null);
                                setSearchTerm("");
                            }}
                            className="p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-red-500"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* BARRA DE BÚSQUEDA Y NAVEGACIÓN */}
                <div className="px-8 py-4 bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {selectedBrand && (
                            <button
                                onClick={() => {
                                    setSelectedBrand(null);
                                    setSearchTerm("");
                                }}
                                className="group flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:shadow-md transition-all"
                            >
                                <ChevronRight className="h-4 w-4 rotate-180 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                Volver a Marcas
                            </button>
                        )}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder={selectedBrand ? `Filtrar modelos de ${selectedBrand}...` : "Buscar marca (Ej: Toyota, Chevrolet...)"}
                                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-medium placeholder:text-slate-400 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTENIDO SCROLLABLE */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                    {!selectedBrand ? (
                        /* VISTA DE MARCAS (GRID) */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredStats.map((brand: any) => (
                                <button
                                    key={brand.brand}
                                    onClick={() => {
                                        setSelectedBrand(brand.brand);
                                        setSearchTerm("");
                                    }}
                                    className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 text-left h-full"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                            {brand.totalModels} Modelos
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors">
                                        {textFormatter.capitalize(brand.brand)}
                                    </h3>

                                    <div className="mt-auto pt-4 space-y-3">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Precio Promedio</p>
                                            <p className="text-2xl font-black text-slate-800 tabular-nums tracking-tight">
                                                ${Math.round(brand.avgPrice).toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Min</span>
                                                <span className="text-sm font-bold text-emerald-600 tabular-nums">${(brand.minPrice / 1000).toFixed(1)}k</span>
                                            </div>
                                            <div className="h-8 w-px bg-slate-100"></div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Max</span>
                                                <span className="text-sm font-bold text-indigo-600 tabular-nums">${(brand.maxPrice / 1000).toFixed(1)}k</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute top-5 right-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <ArrowRight className="h-5 w-5 text-indigo-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* VISTA DE MODELOS (DETALLE) */
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {modelYearStats.map(({ model, stats }) => (
                                <div key={model} className="bg-white rounded-3xl p-1 border border-slate-200 shadow-sm">
                                    {/* Encabezado del Modelo */}
                                    <div className="px-6 py-5 flex items-center gap-4 border-b border-slate-100">
                                        <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
                                            <Gauge className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 tracking-tight">
                                                {model.toUpperCase()}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                <p className="text-xs font-semibold text-slate-500">
                                                    {stats.length} {stats.length === 1 ? 'año registrado' : 'años registrados'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grid de Años */}
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50/50 rounded-b-[1.4rem]">
                                        {stats.map((stat) => {
                                            const priceRange = stat.max_price && stat.min_price
                                                ? Number(stat.max_price) - Number(stat.min_price)
                                                : 0;
                                            const variability = stat.max_price && priceRange
                                                ? (priceRange / Number(stat.max_price)) * 100
                                                : 0;

                                            return (
                                                <div
                                                    key={stat.id}
                                                    className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                                                        <Activity className="h-12 w-12 text-indigo-600 -mr-4 -mt-4 rotate-12" />
                                                    </div>

                                                    {/* Año Badge */}
                                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-900 text-white text-sm font-bold shadow-md shadow-slate-200">
                                                            {stat.year || 'S/A'}
                                                        </span>
                                                        {variability > 0 && (
                                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${variability > 30
                                                                ? 'bg-red-50 text-red-600 border-red-100'
                                                                : variability > 15
                                                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                }`}>
                                                                ±{variability.toFixed(0)}% VAR
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-4 relative z-10">
                                                        {/* Precio Principal */}
                                                        <div>
                                                            <div className="flex items-center gap-1.5 mb-1 text-indigo-600">
                                                                <DollarSign className="h-3.5 w-3.5" />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Precio Sugerido</span>
                                                            </div>
                                                            <div className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                                                                ${stat.median_price ? Number(stat.median_price).toLocaleString() : 'N/A'}
                                                            </div>
                                                        </div>

                                                        {/* Min / Max Grid */}
                                                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                                                            <div>
                                                                <div className="flex items-center gap-1 mb-1 text-emerald-600">
                                                                    <TrendingDown className="h-3 w-3" />
                                                                    <span className="text-[9px] font-bold uppercase">Mínimo</span>
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-700 tabular-nums">
                                                                    ${stat.min_price ? Number(stat.min_price).toLocaleString() : '-'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex items-center justify-end gap-1 mb-1 text-red-500">
                                                                    <span className="text-[9px] font-bold uppercase">Máximo</span>
                                                                    <TrendingUp className="h-3 w-3" />
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-700 tabular-nums">
                                                                    ${stat.max_price ? Number(stat.max_price).toLocaleString() : '-'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Empty State Modelos */}
                            {modelYearStats.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                                        <Search className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">No hay modelos coincidentes</h3>
                                    <p className="text-slate-500">Intenta buscar con otro término</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty State Marcas */}
                    {!selectedBrand && filteredStats.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                            <div className="bg-slate-100 p-4 rounded-full mb-4">
                                <Search className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No se encontraron marcas</h3>
                            <p className="text-slate-500">Prueba ajustando tu búsqueda</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}