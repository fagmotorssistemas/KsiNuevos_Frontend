import React from "react";
import type { SpecsFilter } from "@/hooks/Homeksi/modules/filterBySpecs";

interface FilterSpecsProps {
  specs: SpecsFilter;
  // Recibe la key (minYear, transmission, etc) y el valor
  onChange: (key: keyof SpecsFilter, value: any) => void;
}

export const FilterSpecs = ({ specs, onChange }: FilterSpecsProps) => {
  
  // Manejo de checkboxes de Transmisión
  const toggleTransmission = (type: string) => {
    const current = specs.transmission || [];
    if (current.includes(type)) {
      onChange("transmission", current.filter((t) => t !== type));
    } else {
      onChange("transmission", [...current, type]);
    }
  };

  return (
    <div className="mb-6 space-y-6 border-b border-gray-200 pb-6">
      
      {/* Transmisión */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">Transmisión</h3>
        <div className="space-y-2">
          {["Automática", "Manual"].map((type) => (
            <label key={type} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={specs.transmission?.includes(type) || false}
                onChange={() => toggleTransmission(type)}
              />
              <span className="ml-2 text-sm text-gray-600">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Año */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">Año</h3>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            placeholder="Desde"
            className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={specs.minYear || ""}
            onChange={(e) => onChange("minYear", e.target.value ? parseInt(e.target.value) : undefined)}
          />
          <input
            type="number"
            placeholder="Hasta"
            className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={specs.maxYear || ""}
            onChange={(e) => onChange("maxYear", e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );
};