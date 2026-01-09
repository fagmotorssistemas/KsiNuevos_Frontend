import React from "react";

interface FilterCategoryProps {
  selected: string[];
  onChange: (categories: string[]) => void;
}

// Puedes traer esto de una constante o base de datos más adelante
const CATEGORY_OPTIONS = ["SUV", "Sedan", "Hatchback", "Camioneta", "Coupe"];

export const FilterCategory = ({ selected, onChange }: FilterCategoryProps) => {
  
  const toggleCategory = (category: string) => {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  };

  return (
    <div className="mb-6 border-b border-gray-200 pb-6">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Tipo de Vehículo</h3>
      <div className="space-y-2">
        {CATEGORY_OPTIONS.map((cat) => (
          <label key={cat} className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={selected.includes(cat)}
              onChange={() => toggleCategory(cat)}
            />
            <span className="ml-2 text-sm text-gray-600">{cat}</span>
          </label>
        ))}
      </div>
    </div>
  );
};