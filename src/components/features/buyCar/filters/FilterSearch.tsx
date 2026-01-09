// src/components/features/buyCar/filters/FilterSearch.tsx
import React from "react";

interface FilterSearchProps {
  value: string;
  onChange: (val: string) => void;
}

export const FilterSearch = ({ value, onChange }: FilterSearchProps) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
      <input
        type="text"
        className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        placeholder="Marca, modelo..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};