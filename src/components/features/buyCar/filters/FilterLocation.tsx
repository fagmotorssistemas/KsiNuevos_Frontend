import React from "react";

interface FilterLocationProps {
  selected: string[];
  onChange: (locations: string[]) => void;
}

const LOCATION_OPTIONS = ["Quito", "Guayaquil", "Cuenca", "Ambato", "Manta"];

export const FilterLocation = ({ selected, onChange }: FilterLocationProps) => {
  
  const toggleLocation = (city: string) => {
    if (selected.includes(city)) {
      onChange(selected.filter((c) => c !== city));
    } else {
      onChange([...selected, city]);
    }
  };

  return (
    <div className="mb-6 border-b border-gray-200 pb-6">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Ubicación</h3>
      <div className="space-y-2">
        {LOCATION_OPTIONS.map((city) => (
          <label key={city} className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={selected.includes(city)}
              onChange={() => toggleLocation(city)}
            />
            <span className="ml-2 text-sm text-gray-600">{city}</span>
          </label>
        ))}
      </div>
    </div>
  );
};