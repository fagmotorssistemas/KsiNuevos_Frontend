"use client";

import { useState, useMemo } from "react";
import { TextFormatter } from "@/utils/TextFormatter";
import {
    Search,
    X,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Gauge,
    ArrowRight,
} from "lucide-react";
import type { PriceStatistics } from "./interfaces";

interface PriceStatisticsViewProps {
    priceStatistics: PriceStatistics[];
    isLoading?: boolean;
}

// 1. Agregamos una interfaz para tipar correctamente las estadísticas agrupadas
interface BrandStat {
    brand: string;
    totalModels: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
}

export function PriceStatisticsView({ priceStatistics, isLoading }: PriceStatisticsViewProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const textFormatter = new TextFormatter();

    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        priceStatistics.forEach((stat) => {
            if (stat.brand) brands.add(stat.brand);
        });
        return Array.from(brands).sort();
    }, [priceStatistics]);

    // 2. Tipamos explícitamente el return y eliminamos el código muerto del "if"
    const filteredStats = useMemo((): BrandStat[] => {
        if (selectedBrand) {
            // Cuando hay una marca seleccionada, la UI usa modelYearStats en lugar de filteredStats.
            // Retornamos un arreglo vacío para mantener la consistencia del tipo.
            return [];
        }

        return availableBrands
            .filter((brand) => brand.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((brand) => {
                const stats = priceStatistics.filter((s) => s.brand === brand);
                const totalModels = new Set(stats.map((s) => s.model)).size;
                const avgPrice =
                    stats.length > 0
                        ? stats.reduce(
                              (sum, s) => sum + Number(s.median_price || s.avg_price || 0),
                              0
                          ) / stats.length
                        : 0;
                const minPrice = Math.min(
                    ...stats.map((s) => Number(s.min_price || 0)).filter((p) => p > 0)
                );
                const maxPrice = Math.max(...stats.map((s) => Number(s.max_price || 0)));

                return {
                    brand,
                    totalModels,
                    avgPrice,
                    minPrice,
                    maxPrice,
                };
            });
    }, [priceStatistics, selectedBrand, searchTerm, availableBrands]);

    const modelYearStats = useMemo(() => {
        if (!selectedBrand) return [];

        const stats = priceStatistics.filter(
            (stat) =>
                stat.brand === selectedBrand &&
                (stat.model?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        );

        const grouped = stats.reduce(
            (acc, stat) => {
                const model = stat.model || "Sin modelo";
                if (!acc[model]) acc[model] = [];
                acc[model].push(stat);
                return acc;
            },
            {} as Record<string, PriceStatistics[]>
        );

        return Object.entries(grouped).map(([model, modelStats]) => ({
            model,
            stats: modelStats.sort((a, b) => {
                if (a.year === null) return 1;
                if (b.year === null) return -1;
                return Number(b.year) - Number(a.year);
            }),
        }));
    }, [priceStatistics, selectedBrand, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-slate-500">Cargando estadísticas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="px-0 py-4 border-b border-slate-100 bg-white rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {selectedBrand && (
                        <button
                            onClick={() => {
                                setSelectedBrand(null);
                                setSearchTerm("");
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors w-fit"
                        >
                            <ArrowRight className="h-4 w-4 rotate-180 text-slate-500" />
                            Volver a Marcas
                        </button>
                    )}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={
                                selectedBrand
                                    ? `Filtrar modelos de ${selectedBrand}...`
                                    : "Buscar marca (Ej: Toyota, Chevrolet...)"
                            }
                            className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-medium placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="min-h-[400px]">
                {!selectedBrand ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {/* 3. El map ya no requiere un tipado manual en línea porque TypeScript sabe que es BrandStat[] */}
                        {filteredStats.map((brand) => (
                            <button
                                key={brand.brand}
                                onClick={() => {
                                    setSelectedBrand(brand.brand);
                                    setSearchTerm("");
                                }}
                                className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-400 hover:shadow-lg transition-all duration-300 text-left h-full"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                        <Package className="h-6 w-6" />
                                    </div>
                                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                        {brand.totalModels} Modelos
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                                    {textFormatter.capitalize(brand.brand)}
                                </h3>
                                <div className="mt-auto pt-4 space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Precio Promedio
                                        </p>
                                        <p className="text-2xl font-bold text-slate-800 tabular-nums">
                                            ${Math.round(brand.avgPrice).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Min</span>
                                            <span className="block text-sm font-bold text-emerald-600 tabular-nums">
                                                ${(brand.minPrice / 1000).toFixed(1)}k
                                            </span>
                                        </div>
                                        <div className="h-8 w-px bg-slate-100" />
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Max</span>
                                            <span className="block text-sm font-bold text-amber-600 tabular-nums">
                                                ${(brand.maxPrice / 1000).toFixed(1)}k
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="h-5 w-5 text-amber-400" />
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {modelYearStats.map(({ model, stats }) => (
                            <div
                                key={model}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                            >
                                <div className="px-6 py-5 flex items-center gap-4 border-b border-slate-100">
                                    <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                        <Gauge className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">{model}</h4>
                                        <p className="text-xs text-slate-500">
                                            {stats.length} {stats.length === 1 ? "año" : "años"} registrados
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50/50">
                                    {stats.map((stat) => {
                                        const priceRange =
                                            stat.max_price && stat.min_price
                                                ? Number(stat.max_price) - Number(stat.min_price)
                                                : 0;
                                        const variability =
                                            stat.max_price && priceRange
                                                ? (priceRange / Number(stat.max_price)) * 100
                                                : 0;

                                        return (
                                            <div
                                                key={stat.id}
                                                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="inline-flex px-3 py-1 rounded-lg bg-slate-900 text-white text-sm font-bold">
                                                        {stat.year || "S/A"}
                                                    </span>
                                                    {variability > 0 && (
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                                                                variability > 30
                                                                    ? "bg-red-50 text-red-600 border-red-100"
                                                                    : variability > 15
                                                                    ? "bg-amber-50 text-amber-600 border-amber-100"
                                                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                            }`}
                                                        >
                                                            ±{variability.toFixed(0)}% VAR
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1 text-amber-600">
                                                            <DollarSign className="h-3.5 w-3.5" />
                                                            <span className="text-[10px] font-bold uppercase">
                                                                Precio sugerido
                                                            </span>
                                                        </div>
                                                        <p className="text-xl font-bold text-slate-900 tabular-nums">
                                                            $
                                                            {stat.median_price
                                                                ? Number(stat.median_price).toLocaleString()
                                                                : "N/A"}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                                                        <div>
                                                            <div className="flex items-center gap-1 mb-1 text-emerald-600">
                                                                <TrendingDown className="h-3 w-3" />
                                                                <span className="text-[9px] font-bold uppercase">Mín</span>
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-700 tabular-nums">
                                                                $
                                                                {stat.min_price
                                                                    ? Number(stat.min_price).toLocaleString()
                                                                    : "-"}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="flex items-center justify-end gap-1 mb-1 text-amber-600">
                                                                <span className="text-[9px] font-bold uppercase">Máx</span>
                                                                <TrendingUp className="h-3 w-3" />
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-700 tabular-nums">
                                                                $
                                                                {stat.max_price
                                                                    ? Number(stat.max_price).toLocaleString()
                                                                    : "-"}
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
                    </div>
                )}

                {!selectedBrand && filteredStats.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">No se encontraron marcas</h3>
                        <p>Prueba ajustando tu búsqueda</p>
                    </div>
                )}
                {selectedBrand && modelYearStats.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">No hay modelos coincidentes</h3>
                        <p>Intenta con otro término</p>
                    </div>
                )}
            </div>
        </div>
    );
}