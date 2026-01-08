import React from "react";
import type { InventoryFilters } from "@/hooks/Homeksi/UseInventoryHook";

interface SidebarFiltersProps {
  filters: InventoryFilters;
  updateFilter: (key: keyof InventoryFilters, value: any) => void;
  onClear: () => void;
}

export const SidebarFilters = ({ filters, updateFilter, onClear }: SidebarFiltersProps) => {
  return (
    <div className="hidden lg:block w-64 flex-shrink-0 pr-6 border-r border-gray-200 h-fit sticky top-24">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Filtros</h3>
          <button className="text-xs text-blue-600 font-semibold hover:underline">
            Limpiar
          </button>
        </div>

        <div className="mb-6 border-b border-gray-100 pb-6">
          <h4 className="font-semibold text-sm mb-3 text-gray-800">Buscar</h4>
          <input
            type="text"
            placeholder="Marca, modelo..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6 border-b border-gray-100 pb-6">
          <h4 className="font-semibold text-sm mb-3 text-gray-800">Año Mínimo</h4>
          <select 
            value={filters.minYear}
            onChange={(e) => updateFilter("minYear", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="">Cualquier año</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2018">2018+</option>
          </select>
        </div>

        <div className="mb-6">
            <h4 className="font-semibold text-sm mb-3 text-gray-800">Ubicación</h4>
            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input 
                        type="radio" 
                        name="location" 
                        checked={filters.location === 'all'}
                        onChange={() => updateFilter('location', 'all')}
                        className="text-blue-600 focus:ring-blue-500" 
                    />
                    Todas
                </label>
            </div>
        </div>
      </div>
    </div>
  );
};