import React from "react";
import type { SortOption } from "@/hooks/Homeksi/UseInventoryHook";

interface CatalogToolbarProps {
  totalCount: number;
  sortBy: SortOption;
  setSortBy: (val: SortOption) => void;
}

export const CatalogToolbar = ({ totalCount, sortBy, setSortBy }: CatalogToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm lg:bg-transparent lg:p-0 lg:border-0 lg:shadow-none">
      <span className="text-gray-600 font-medium">
        Mostrando {totalCount} resultados
      </span>

      <div className="flex gap-3 w-full sm:w-auto">
        <button className="lg:hidden flex-1 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Filtros
        </button>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="flex-1 sm:flex-none bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Menor Precio</option>
          <option value="price_desc">Mayor Precio</option>
          <option value="year_desc">Año más nuevo</option>
          <option value="year_asc">Año más antiguo</option>
        </select>
      </div>
    </div>
  );
};