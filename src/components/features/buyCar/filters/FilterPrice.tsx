import React from "react";

interface FilterPriceProps {
  minVal: number | null;
  maxVal: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

export const FilterPrice = ({ minVal, maxVal, onChange }: FilterPriceProps) => {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : null;
    onChange(val, maxVal);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : null;
    onChange(minVal, val);
  };

  return (
    <div className="mb-6 border-b border-gray-200 pb-6">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Precio</h3>
      <div className="flex items-center space-x-2">
        <input
          type="number"
          placeholder="Mín"
          className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          value={minVal || ""}
          onChange={handleMinChange}
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          placeholder="Máx"
          className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          value={maxVal || ""}
          onChange={handleMaxChange}
        />
      </div>
    </div>
  );
};