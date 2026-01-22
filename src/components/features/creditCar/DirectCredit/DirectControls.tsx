import React from "react";
import { CheckCircle2, Car, Calendar, ChevronDown, DollarSign } from "lucide-react";
import { formatMoney } from "../simulator.utils";
import { monthOptions } from "../simulator.constants"; // [12, 24, 36...]
import type { UnifiedSimulatorState } from "../../../../types/simulator.types";

interface Props {
  setIsSimulated: (v: boolean) => void;
  data: UnifiedSimulatorState;
}

export const DirectControls = ({ setIsSimulated, data }: Props) => {
  const { 
    inventory, selectedVehicle, vehiclePrice, downPaymentAmount, 
    downPaymentPercentage, termMonths, updateField, updateDownPaymentByAmount 
  } = data;

  const inputBaseClasses = "w-full pl-11 pr-10 py-3 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#c22e2e] focus:ring-1 focus:ring-[#c22e2e] transition-all text-gray-700 text-sm font-medium shadow-sm cursor-pointer appearance-none";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SELECCIÓN */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Elige tu vehículo</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Car size={18} /></div>
          <select
            className={inputBaseClasses}
            onChange={(e) => {
              const car = inventory.find((c) => c.id === e.target.value);
              if (car) updateField("selectedVehicle", car);
            }}
            value={selectedVehicle?.id || ""}
          >
            <option value="" disabled>Selecciona un modelo...</option>
            {inventory.map((car) => (
              <option key={car.id} value={car.id}>{car.brand} {car.model} ({car.year})</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDown size={16} /></div>
        </div>
        {selectedVehicle && (
           <div className="mt-2 text-right text-xs">
             <span className="font-medium text-gray-500">Precio: </span>
             <span className="font-bold text-gray-800">{formatMoney(selectedVehicle.price)}</span>
           </div>
        )}
      </div>

      {/* 2. ENTRADA (Mínimo 60%) */}
      <div className={!selectedVehicle ? "opacity-50 pointer-events-none" : ""}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">Entrada inicial</label>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${downPaymentPercentage >= 60 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            Mínimo 60%
          </span>
        </div>

        <div className="relative mb-3">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign size={16} /></div>
          <input
            type="number"
            value={selectedVehicle ? Math.round(downPaymentAmount) : 0}
            min={vehiclePrice * 0.6}
            onChange={(e) => updateDownPaymentByAmount(Number(e.target.value))}
            className={`${inputBaseClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="0"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
             {downPaymentPercentage >= 60 && <CheckCircle2 size={18} className="text-green-500" />}
          </div>
        </div>

        {/* Slider 60% a 90% */}
        <div className="relative w-full h-1 bg-gray-200 rounded-full mt-2">
           <div className="absolute h-full bg-[#c22e2e] rounded-full transition-all" style={{ width: `${((downPaymentPercentage - 60) / 30) * 100}%` }} />
           <input
            type="range" min="60" max="90" step="1"
            value={downPaymentPercentage < 60 ? 60 : downPaymentPercentage}
            onChange={(e) => updateField("downPaymentPercentage", Number(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer inset-0"
          />
        </div>
        <div className="text-right mt-1"><span className="text-xs text-gray-400 font-medium">{downPaymentPercentage}% seleccionado</span></div>
      </div>

      {/* 3. PLAZO (Normal) */}
      <div className={!selectedVehicle ? "opacity-50 pointer-events-none" : ""}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Plazo de pago</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Calendar size={18} /></div>
          <select
            className={inputBaseClasses}
            value={termMonths}
            onChange={(e) => updateField("termMonths", Number(e.target.value))}
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>{month} Meses</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDown size={16} /></div>
        </div>
      </div>

      <button onClick={() => setIsSimulated(true)} disabled={!selectedVehicle} className={`w-full py-3.5 rounded-lg text-sm font-bold transition-all mt-2 ${!selectedVehicle ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-[#c22e2e] text-white hover:bg-[#a52626] shadow-md hover:shadow-lg"}`}>
        Calcular Cuotas
      </button>
    </div>
  );
};