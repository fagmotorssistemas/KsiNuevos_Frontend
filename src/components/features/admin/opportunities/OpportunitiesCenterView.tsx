"use client";

import { scraperService, VehicleWithSeller } from "@/services/scraper.service";
import {
    DatabaseZap, Search, Car, RefreshCcw, X, Zap, Sparkles,
    MapPin, Tag, Calendar, MapPinned, ArrowUpDown, Filter,
    Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PriceStatisticsModal } from "./PriceStatisticsModal";
import { FilterModal } from "./components/FilterModal";
import { FilterButton } from "./components/FilterButton";
import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";
import type { OpportunitiesCenterViewProps } from "./interfaces";
import { OpportunitiesModal } from "./OpportunitiesModal";
import { VehicleComparisonPanel } from "./VehicleComparisonPanel";

const DATE_RANGE_OPTIONS = ["Hoy", "Ayer", "Última semana", "Último mes"];

const DATE_RANGE_TO_VALUE: Record<string, string> = {
    "Hoy": "today", "Ayer": "yesterday",
    "Última semana": "week", "Último mes": "month",
};

const VALUE_TO_DATE_LABEL: Record<string, string> = {
    today: "Hoy", yesterday: "Ayer",
    week: "Última semana", month: "Último mes", all: "Cualquier Fecha",
};

const SORT_OPTIONS = [
    { value: "created_at_desc", label: "Recién scrapeados" },
    { value: "publication_date_desc", label: "Fecha de publicación: más recientes" },
    { value: "price_asc", label: "Precio: menor a mayor" },
    { value: "price_desc", label: "Precio: mayor a menor" },
];

export const OpportunitiesCenterView = ({
    onScraperComplete,
    vehicles,
    selectedBrand, selectedModel, selectedMotor, selectedYear,
    selectedCity, selectedDateRange, regionFilter, searchTerm, sortBy,
    availableBrands, availableModels, availableMotors, availableYears, availableCities, priceStatistics,
    onBrandChange, onModelChange, onMotorChange, onYearChange,
    onCityChange, onDateRangeChange, onRegionFilterChange,
    onSearchTermChange, onSortChange, onClearFilters,
}: OpportunitiesCenterViewProps) => {

    const [isWebhookLoading, setIsWebhookLoading] = useState(false);
    const [scraperTerm, setScraperTerm] = useState("");
    const [progress, setProgress] = useState(0);
    const [currentToastId, setCurrentToastId] = useState<string | number | null>(null);

    const [showScannerModal, setShowScannerModal] = useState(false);
    const [showCarPicker, setShowCarPicker] = useState(false);
    const [pickerBrand, setPickerBrand] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [showModelModal, setShowModelModal] = useState(false);
    const [showMotorModal, setShowMotorModal] = useState(false);
    const [showYearModal, setShowYearModal] = useState(false);
    const [showCityModal, setShowCityModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [showComparisonPanel, setShowComparisonPanel] = useState(false);
    // ── Helpers ────────────────────────────────────────────────────────────
    const getDateRangeLabel = (v: string) => VALUE_TO_DATE_LABEL[v] ?? "Cualquier Fecha";
    const getSortLabel = (v: string) => SORT_OPTIONS.find(o => o.value === v)?.label ?? "Ordenar por";

    const handleDateRangeChange = useCallback((label: string) => {
        onDateRangeChange(DATE_RANGE_TO_VALUE[label] ?? "all");
    }, [onDateRangeChange]);

    const handleBrandChange = useCallback((brand: string) => {
        onBrandChange(brand);
        onModelChange("all");
    }, [onBrandChange, onModelChange]);

    const hasActiveFilters = useMemo(() =>
        selectedBrand !== "all" || selectedModel !== "all" || selectedMotor !== "all" ||
        selectedYear !== "all" || selectedDateRange !== "all" || selectedCity !== "all" ||
        sortBy !== "created_at_desc" || searchTerm !== "" || regionFilter !== "all",
        [selectedBrand, selectedModel, selectedMotor, selectedYear, selectedDateRange,
            selectedCity, sortBy, searchTerm, regionFilter]
    );

    // Contadores informativos
    const brandFilteredCount = vehicles.filter(v => v.brand === selectedBrand).length;
    const modelFilteredCount = vehicles.filter(v => v.brand === selectedBrand && v.model === selectedModel).length;

    // ── Scraper: toast de progreso ─────────────────────────────────────────
    useEffect(() => {
        if (!currentToastId || !isWebhookLoading) return;
        toast.loading(
            <div className="relative flex flex-col gap-3 ml-2 w-full pr-8">
                <button onClick={() => toast.dismiss(currentToastId)} className="absolute right-0 p-1 text-red-300 hover:opacity-50">
                    <X className="h-4 w-4" />
                </button>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-red-400 text-sm">Analizando Marketplace...</span>
                    <span className="text-[10px] font-mono text-red-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
            </div>,
            { id: currentToastId }
        );
    }, [progress, currentToastId, isWebhookLoading]);

    // ── Scraper: submit ────────────────────────────────────────────────────
    const handleSubmitScraper = useCallback(async (searchValue: string) => {
        if (!searchValue.trim()) {
            toast.error("Ingresa un término de búsqueda", { duration: 2000 });
            return;
        }
        setIsWebhookLoading(true);
        setProgress(0);
        const toastId = toast.loading("Iniciando escaneo...");
        setCurrentToastId(toastId);

        const interval = setInterval(() => {
            setProgress(p => p >= 95 ? p : p + (p < 70 ? 2 : 0.5));
        }, 1000);

        try {
            const response = await scraperService.scrapMarketplace(searchValue);
            clearInterval(interval);
            if (!response || response.status !== "done") throw new Error(response?.message ?? "Error inesperado");
            setProgress(100);
            setTimeout(() => {
                toast.success(
                    <div className="ml-2">
                        ¡Extracción completa!
                        <span className="block text-[10px] opacity-70">{response.summary?.vehicles?.total ?? 0} vehículos encontrados</span>
                    </div>,
                    { id: toastId, duration: Infinity }
                );
                setIsWebhookLoading(false);
                setCurrentToastId(null);
                setShowScannerModal(false);
                onScraperComplete?.();
            }, 1000);
        } catch (err: any) {
            clearInterval(interval);
            toast.error(
                <div className="relative flex items-center gap-3 ml-2 w-full pr-8">
                    <button onClick={() => toast.dismiss(toastId)} className="absolute right-0 p-1 text-red-300 hover:opacity-50"><X className="h-4 w-4" /></button>
                    <span className="font-semibold text-sm">{err.message ?? "Error en el proceso"}</span>
                </div>,
                { id: toastId, duration: Infinity }
            );
            setIsWebhookLoading(false);
            setCurrentToastId(null);
            setProgress(0);
        }
    }, [onScraperComplete]);

    const handlePickAndScrap = useCallback((brand: string, model?: string) => {
        const term = model ? `${brand} ${model}` : brand;
        setScraperTerm(term);
        setShowCarPicker(false);
        handleSubmitScraper(term);
    }, [handleSubmitScraper]);

    console.log(selectedCity);


    // ── RENDER ─────────────────────────────────────────────────────────────
    return (
        <>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mb-4">

                {/* ZONA 1: CABECERA Y ACCIONES GLOBALES */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-6 py-5 border-b border-slate-100 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <DatabaseZap className="h-5 w-5 text-red-600" />
                            Explorador de Marketplace
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                        <button
                            onClick={() => onScraperComplete?.()}
                            disabled={isWebhookLoading}
                            className={`flex items-center justify-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm ${isWebhookLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                            title="Actualizar datos"
                        >
                            <RefreshCcw className={`h-5 w-5 ${isWebhookLoading ? 'animate-spin' : ''}`} />
                        </button>

                        {/* ── Botón de Oportunidades Mejorado ── */}
                        <button
                            onClick={() => setShowComparisonPanel(true)}
                            className="flex-1 sm:flex-none group flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            <Trophy className="h-4 w-4 text-amber-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
                            <span className="truncate">Mejores Oportunidades</span>
                        </button>

                        <button
                            onClick={() => setShowScannerModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-200/50 active:scale-95"
                        >
                            <Zap className="h-4 w-4" />
                            <span>Escanear</span>
                        </button>
                    </div>

                    {/* ── Modal ── */}
                    {showComparisonPanel && (
                        <OpportunitiesModal onClose={() => setShowComparisonPanel(false)}>
                            <VehicleComparisonPanel
                                priceStatistics={priceStatistics}
                                limit={6}
                            />
                        </OpportunitiesModal>
                    )}
                </div>

                {/* ZONA 2: BÚSQUEDA, REGIÓN Y ORDEN (Navegación principal) */}
                <div className="flex flex-col lg:flex-row gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 items-center">

                    {/* Buscador amplio */}
                    <div className="w-full lg:flex-1 relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, versión, características..."
                            className="w-full h-11 pl-11 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:border-red-400 focus:ring-4 focus:ring-red-100 outline-none transition-all shadow-sm placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => onSearchTermChange(e.target.value)}
                        />
                    </div>

                    {/* Controles secundarios (Región + Orden) */}
                    <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
                        {/* Selector de Región estilo Switch */}
                        <div className="w-full sm:w-auto flex bg-slate-200/50 p-1 rounded-xl">
                            <button
                                onClick={() => onRegionFilterChange('all')}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${regionFilter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <MapPin className="h-3.5 w-3.5" /> Todo Ecuador
                            </button>
                            <button
                                onClick={() => onRegionFilterChange('sierra')}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${regionFilter === 'sierra' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Sierra
                            </button>
                        </div>

                        {/* Botón de Orden */}
                        <button
                            onClick={() => setShowSortModal(true)}
                            className={`w-full sm:w-auto h-11 flex items-center justify-between gap-3 px-4 text-sm bg-white border rounded-xl transition-all shadow-sm ${sortBy !== "created_at_desc" ? 'border-slate-900 text-slate-900 ring-1 ring-slate-900 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span className="truncate">{getSortLabel(sortBy)}</span>
                            <ArrowUpDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        </button>
                    </div>
                </div>

                {/* ZONA 3: FILTROS ESPECÍFICOS */}
                <div className="px-6 py-5 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-800">Filtros Avanzados</h3>
                        {hasActiveFilters && (
                            <button
                                onClick={onClearFilters}
                                className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <X className="h-3 w-3" />
                                Limpiar todos
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <FilterButton
                            label={selectedBrand === "all" ? "Marca" : `${selectedBrand} (${brandFilteredCount})`}
                            active={selectedBrand !== "all"} hasSelection={selectedBrand !== "all"}
                            icon={Tag} onClick={() => setShowBrandModal(true)}
                        />
                        <FilterButton
                            label={selectedModel === "all" ? "Modelo" : `${selectedModel} (${modelFilteredCount})`}
                            active={selectedModel !== "all"} hasSelection={selectedModel !== "all"}
                            icon={Car} onClick={() => setShowModelModal(true)}
                            disabled={selectedBrand === "all"}
                        />
                        <FilterButton
                            label={selectedMotor === "all" ? "Motor" : selectedMotor}
                            active={selectedMotor !== "all"} hasSelection={selectedMotor !== "all"}
                            icon={Zap} onClick={() => setShowMotorModal(true)}
                        />
                        <FilterButton
                            label={selectedYear === "all" ? "Año" : selectedYear}
                            active={selectedYear !== "all"} hasSelection={selectedYear !== "all"}
                            icon={Calendar} onClick={() => setShowYearModal(true)}
                        />
                        <FilterButton
                            label={selectedCity === "all" ? "Ciudad" : selectedCity}
                            active={selectedCity !== "all"} hasSelection={selectedCity !== "all"}
                            icon={MapPinned} onClick={() => setShowCityModal(true)}
                        />
                        <FilterButton
                            label={getDateRangeLabel(selectedDateRange) === "Cualquier Fecha" ? "Fecha Pub." : getDateRangeLabel(selectedDateRange)}
                            active={selectedDateRange !== "all"} hasSelection={selectedDateRange !== "all"}
                            icon={Filter} onClick={() => setShowDateModal(true)}
                        />
                    </div>
                </div>
            </div>

            <FilterModal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)}
                title="Seleccionar Marca" description="Elige la marca del vehículo que buscas"
                icon={<Tag className="h-6 w-6 text-white" />}
                options={availableBrands} selectedValue={selectedBrand} onSelect={handleBrandChange}
                searchPlaceholder="Buscar marca (Ej: Toyota, Kia...)" allLabel="Todas las Marcas" />

            <FilterModal isOpen={showModelModal} onClose={() => setShowModelModal(false)}
                title={`Modelos de ${selectedBrand}`} description="Selecciona el modelo específico"
                icon={<Car className="h-6 w-6 text-white" />}
                options={availableModels} selectedValue={selectedModel} onSelect={onModelChange}
                searchPlaceholder={`Buscar modelo de ${selectedBrand}...`} allLabel="Todos los Modelos" />

            <FilterModal isOpen={showMotorModal} onClose={() => setShowMotorModal(false)}
                title="Seleccionar Motor" description="Filtra vehículos por tipo de motor"
                icon={<Zap className="h-6 w-6 text-white" />}
                options={availableMotors} selectedValue={selectedMotor} onSelect={onMotorChange}
                searchPlaceholder="Buscar motor..." allLabel="Todos los Motores" />

            <FilterModal isOpen={showYearModal} onClose={() => setShowYearModal(false)}
                title="Seleccionar Año" description="Filtra vehículos por año de fabricación"
                icon={<Calendar className="h-6 w-6 text-white" />}
                options={availableYears} selectedValue={selectedYear} onSelect={onYearChange}
                searchPlaceholder="Buscar año..." allLabel="Todos los Años" />

            <FilterModal isOpen={showCityModal} onClose={() => setShowCityModal(false)}
                title="Seleccionar Ciudad" description="Filtra vehículos por ubicación"
                icon={<MapPinned className="h-6 w-6 text-white" />}
                options={availableCities} selectedValue={selectedCity} onSelect={onCityChange}
                searchPlaceholder="Buscar ciudad..." allLabel="Todas las Ciudades" />

            <FilterModal isOpen={showDateModal} onClose={() => setShowDateModal(false)}
                title="Filtrar por Fecha" description="Selecciona el rango de publicación"
                icon={<Calendar className="h-6 w-6 text-white" />}
                options={DATE_RANGE_OPTIONS} selectedValue={getDateRangeLabel(selectedDateRange)}
                onSelect={handleDateRangeChange} searchPlaceholder="Buscar rango..."
                allLabel="Cualquier Fecha" showAllOption={true} />

            <FilterModal isOpen={showSortModal} onClose={() => setShowSortModal(false)}
                title="Ordenar Resultados" description="Selecciona cómo quieres ordenar los vehículos"
                icon={<ArrowUpDown className="h-6 w-6 text-white" />}
                options={SORT_OPTIONS.map(o => o.label)} selectedValue={getSortLabel(sortBy)}
                onSelect={label => { const o = SORT_OPTIONS.find(o => o.label === label); if (o) onSortChange(o.value); }}
                searchPlaceholder="Buscar tipo de ordenamiento..." allLabel="Por Defecto" showAllOption={false} />

            <PriceStatisticsModal priceStatistics={priceStatistics} isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />

            {/* ── MODAL SCANNER ────────────────────────────────────────────────────── */}
            {showScannerModal && (
                <div className="fixed inset-0 z-[60] flex items-center h-[100vh] justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
                                    <DatabaseZap className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Centro de Oportunidades</h3>
                                    <p className="text-sm text-slate-500">Escanea vehículos en Marketplace</p>
                                </div>
                            </div>
                            <button onClick={() => setShowScannerModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 bg-slate-50/50">
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                <div className="relative w-full sm:flex-1 min-w-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Escaneo rápido: Ej. Vitara 2015..."
                                        className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm"
                                        value={scraperTerm}
                                        onChange={e => setScraperTerm(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !isWebhookLoading && handleSubmitScraper(scraperTerm)}
                                    />
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button disabled={isWebhookLoading} onClick={() => setShowCarPicker(true)}
                                        className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm flex-shrink-0 disabled:opacity-50" title="Abrir Catálogo">
                                        <Car className="h-5 w-5" />
                                    </button>
                                    <button disabled={isWebhookLoading || !scraperTerm.trim()} onClick={() => handleSubmitScraper(scraperTerm)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-200 disabled:opacity-50">
                                        {isWebhookLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                        <span>{isWebhookLoading ? `${Math.round(progress)}%` : 'Escanear'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL CATÁLOGO ───────────────────────────────────────────────────── */}
            {showCarPicker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
                                    <Car className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Catálogo Maestro</h3>
                                    <p className="text-sm text-slate-500">{pickerBrand ? `Selecciona el modelo de ${pickerBrand}` : 'Explora marcas disponibles'}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowCarPicker(false); setPickerBrand(null); setCatalogSearch(""); }} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder={pickerBrand ? `Buscar modelo de ${pickerBrand}...` : "Buscar marca (Ej: Toyota, Kia...)"}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all text-slate-800 font-medium"
                                    value={catalogSearch}
                                    onChange={e => setCatalogSearch(e.target.value)}
                                    autoFocus
                                />
                                {catalogSearch && (
                                    <button onClick={() => setCatalogSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                            {!pickerBrand ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {Object.keys(ECUADOR_CAR_DATA)
                                        .filter(b => b.toLowerCase().includes(catalogSearch.toLowerCase()))
                                        .map(b => (
                                            <button key={b} onClick={() => { setPickerBrand(b); setCatalogSearch(""); }}
                                                className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 hover:bg-white hover:border-red-500 hover:text-red-600 hover:shadow-xl hover:shadow-red-100 transition-all active:scale-95">
                                                {b}
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <button onClick={() => { setPickerBrand(null); setCatalogSearch(""); }} className="flex items-center gap-2 text-xs font-bold text-red-500 hover:underline">
                                        ← VOLVER A MARCAS
                                    </button>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {!catalogSearch && (
                                            <button onClick={() => handlePickAndScrap(pickerBrand)}
                                                className="p-6 bg-red-600 border border-red-500 rounded-2xl text-sm font-black text-white hover:bg-red-700 transition-all flex flex-col items-center gap-1 shadow-lg shadow-red-100">
                                                <Sparkles className="h-4 w-4" /> TODO {pickerBrand}
                                            </button>
                                        )}
                                        {ECUADOR_CAR_DATA[pickerBrand]
                                            .filter(m => m.toLowerCase().includes(catalogSearch.toLowerCase()))
                                            .map(m => (
                                                <button key={m} onClick={() => handlePickAndScrap(pickerBrand, m)}
                                                    className="p-6 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all hover:shadow-md">
                                                    {m}
                                                </button>
                                            ))}
                                    </div>
                                    {ECUADOR_CAR_DATA[pickerBrand].filter(m => m.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                                        <div className="py-12 text-center text-slate-400">
                                            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p>No se encontraron modelos que coincidan con "{catalogSearch}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};