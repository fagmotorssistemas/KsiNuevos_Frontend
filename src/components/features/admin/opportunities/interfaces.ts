import type { Database } from "@/types/supabase";
import type { VehicleWithSeller } from "@/services/scraper.service";
import type { ScoredVehicle } from "./opportunitiesScorer";


// ─────────────────────────────────────────────────────────────────────────────
// Shared database row aliases
// ─────────────────────────────────────────────────────────────────────────────

export type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];
export type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

// ─────────────────────────────────────────────────────────────────────────────
// FilterModal
// ─────────────────────────────────────────────────────────────────────────────

/** Puede ser un string simple o un objeto { value, label } */
export type FilterOptionType = string | { value: string; label: string };

export interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    icon: React.ReactNode;
    options: FilterOptionType[];
    selectedValue: string;
    onSelect: (value: string) => void;
    searchPlaceholder?: string;
    allLabel?: string;
    showAllOption?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PriceStatisticsModal
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceStatisticsModalProps {
    priceStatistics: PriceStatistics[];
    isOpen: boolean;
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpportunitiesTableView
// ─────────────────────────────────────────────────────────────────────────────

export interface OpportunitiesTableViewProps {
    vehicles: VehicleWithSeller[];
    isLoading: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    getPriceStatisticsForVehicle?: (brand: string, model: string, year?: string) => Promise<PriceStatistics | null>;
    onVehicleUpdate?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpportunitiesWizardSelection
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleViewType = "ALL" | "PATIO" | "TALLER" | "CLIENTE";

export interface OpportunitiesWizardSelectionProps {
    topOpportunities: ScoredVehicle[];
    onViewAll: () => void;
    isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpportunitiesCenterView
// ─────────────────────────────────────────────────────────────────────────────

export interface OpportunitiesCenterViewProps {
    onScraperComplete?: () => void;
    isLoading?: boolean;
    vehicles: VehicleWithSeller[];

    selectedBrand: string;
    selectedModel: string;
    selectedMotor: string;
    selectedYear: string;
    selectedCity: string;
    selectedDateRange: string;
    regionFilter: 'all' | 'coast' | 'sierra';
    searchTerm: string;
    sortBy: string;

    availableBrands: string[];
    availableModels: string[];
    availableMotors: string[];
    availableYears: string[];
    availableCities: string[];

    totalCount: number;
    enPatio: number;
    enTaller: number;

    priceStatistics: PriceStatistics[];

    onBrandChange: (value: string) => void;
    onModelChange: (value: string) => void;
    onMotorChange: (value: string) => void;
    onYearChange: (value: string) => void;
    onCityChange: (value: string) => void;
    onDateRangeChange: (value: string) => void;
    onRegionFilterChange: (value: 'all' | 'coast' | 'sierra') => void;
    onSearchTermChange: (value: string) => void;
    onSortChange: (value: string) => void;
    onClearFilters: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpportunitiesView
// ─────────────────────────────────────────────────────────────────────────────

export interface OpportunitiesViewProps {
    vehicles: VehicleWithSeller[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        startIndex: number;
        endIndex: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    sellers: ScraperSeller[];
    isLoading: boolean;
    statusFilter?: string;
    locationFilter?: string;
    priceStatistics: PriceStatistics[];
    getPriceStatisticsForVehicle?: (brand: string, model: string, year?: string) => Promise<PriceStatistics | null>;
    stats: {
        total: number;
        nuevos: number;
        usados: number;
        usados_bueno: number;
        usados_como_nuevo: number;
        enPatio: number;
        enTaller: number;
        enCliente: number;
    };
    onScraperComplete?: () => Promise<void>;
    vehicleFilters: {
        brand?: string;
        model?: string;
        motor?: string;
        year?: string;
        city?: string;
        dateRange?: string;
        regionFilter?: 'all' | 'coast' | 'sierra';
        searchTerm?: string;
        sortBy?: string;
    };
    filterOptions: {
        brands: string[];
        models: string[];
        motors: string[];
        years: string[];
        cities: string[];
    };
    updateFilter: (key: string, value: any) => void;
    updateBrand: (brand: string) => void;
    clearFilters: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleComparisonPanel
// ─────────────────────────────────────────────────────────────────────────────

export interface VehicleComparisonPanelProps {
    vehicles: VehicleWithSeller[];
    priceStatistics: PriceStatistics[];
    isLoading?: boolean;
    /** How many top vehicles to show (default 6) */
    limit?: number;
}
