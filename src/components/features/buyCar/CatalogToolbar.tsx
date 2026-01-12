import React from "react";
import type { SortOption } from "@/hooks/Homeksi/UseInventoryHook";

interface CatalogToolbarProps {
  totalCount: number;
  sortBy: SortOption;
  setSortBy: (val: SortOption) => void;
}

export const CatalogToolbar = ({ totalCount, sortBy, setSortBy }: CatalogToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm lg:bg-transparent lg:p-0 lg:border-0 lg:shadow-none">
      <span className="text-neutral-500 font-bold text-sm uppercase tracking-wide">
        Mostrando <span className="text-black">{totalCount}</span> vehículos
      </span>

      <div className="flex gap-3 w-full sm:w-auto">
        <button className="lg:hidden flex-1 bg-white border border-neutral-200 px-4 py-2.5 rounded-lg text-sm font-bold text-black flex items-center justify-center gap-2 hover:bg-neutral-50 hover:border-red-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Filtros
        </button>
        
        <div className="relative flex-1 sm:flex-none">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full appearance-none bg-white border border-neutral-200 text-black font-medium px-4 py-2.5 pr-8 rounded-lg text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 cursor-pointer transition-colors"
          >
            <option value="newest">Más recientes</option>
            <option value="price_asc">Menor Precio</option>
            <option value="price_desc">Mayor Precio</option>
            <option value="year_desc">Año más nuevo</option>
            <option value="year_asc">Año más antiguo</option>
          </select>
          {/* Flecha personalizada */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};