import React from "react";
import { InventoryFiltersState } from "@/hooks/Homeksi/useInventoryMaster";
import { FilterSearch } from "./filters/FilterSearch";
import { FilterPrice } from "./filters/FilterPrice";
import { FilterCategory } from "./filters/FilterCategory";
import { FilterLocation } from "./filters/FilterLocation";
import { FilterSpecs } from "./filters/FilterSpecs";

interface SidebarFiltersProps {
  filters: InventoryFiltersState;
  updateFilter: (key: string, value: any) => void;
  onClear: () => void;
}

export const SidebarFilters = ({ filters, updateFilter, onClear }: SidebarFiltersProps) => {
  return (
    // Borde gris neutro (border-neutral-200) en lugar de gray-200 genérico
    <aside className="hidden lg:block w-64 flex-shrink-0 pr-6 border-r border-neutral-200 h-fit sticky top-24">
      
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-black text-lg uppercase tracking-tight">Filtros</h3>
        <button 
          onClick={onClear}
          // CAMBIO: Azul -> Rojo
          className="text-xs text-red-600 font-bold hover:text-red-700 hover:underline uppercase tracking-wide"
        >
          Limpiar todo
        </button>
      </div>

      <div className="space-y-8">
        {/* --- SECCIÓN 1: BÚSQUEDA --- */}
        <FilterSearch 
          value={filters.searchQuery} 
          onChange={(val) => updateFilter('search', val)} 
        />

        {/* --- SECCIÓN 2: PRECIO --- */}
        <FilterPrice 
          minVal={filters.minPrice} 
          maxVal={filters.maxPrice} 
          onChange={(min, max) => updateFilter('priceRange', [min, max])} 
        />

        {/* --- SECCIÓN 3: ESPECIFICACIONES --- */}
        <FilterSpecs 
          specs={filters.specs} 
          onChange={(key, val) => updateFilter(key as string, val)} 
        />

        {/* --- SECCIÓN 4: CATEGORÍA --- */}
        <FilterCategory 
          selected={filters.categories} 
          onChange={(cats) => updateFilter('categories', cats)} 
        />
      </div>

    </aside>
  );
};