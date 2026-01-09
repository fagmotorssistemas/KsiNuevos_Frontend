import React from "react";
// 1. Importamos el tipo del NUEVO hook maestro
import { InventoryFiltersState } from "@/hooks/Homeksi/useInventoryMaster";

// 2. Importamos los sub-componentes que creaste en la carpeta 'filters'
import { FilterSearch } from "./filters/FilterSearch";
import { FilterPrice } from "./filters/FilterPrice";
import { FilterCategory } from "./filters/FilterCategory";
import { FilterLocation } from "./filters/FilterLocation";
import { FilterSpecs } from "./filters/FilterSpecs";

interface SidebarFiltersProps {
  filters: InventoryFiltersState;
  // Usamos string para la key porque el adaptador en page.tsx maneja la traducción
  updateFilter: (key: string, value: any) => void;
  onClear: () => void;
}

export const SidebarFilters = ({ filters, updateFilter, onClear }: SidebarFiltersProps) => {
  return (
    // Mantenemos tus estilos de contenedor originales (sticky, width, etc.)
    <aside className="hidden lg:block w-64 flex-shrink-0 pr-6 border-r border-gray-200 h-fit sticky top-24">
      
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-900 text-lg">Filtros</h3>
        <button 
          onClick={onClear}
          className="text-xs text-blue-600 font-semibold hover:underline"
        >
          Limpiar
        </button>
      </div>

      {/* --- SECCIÓN 1: BÚSQUEDA --- */}
      {/* Reemplaza tu input manual de búsqueda */}
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

      {/* --- SECCIÓN 3: ESPECIFICACIONES (AÑO Y TRANSMISIÓN) --- */}
      {/* Reemplaza tu select de años antiguo por este más completo */}
      <FilterSpecs 
        specs={filters.specs} 
        onChange={(key, val) => updateFilter(key as string, val)} 
      />

      {/* --- SECCIÓN 4: CATEGORÍA --- */}
      <FilterCategory 
        selected={filters.categories} 
        onChange={(cats) => updateFilter('categories', cats)} 
      />

    </aside>
  );
};