import React from "react";
import { Car, Calendar, ChevronDown, DollarSign, Building2 } from "lucide-react";
import { formatMoney } from "../simulator.utils"; 
import type { UnifiedSimulatorState } from "../../../../types/simulator.types";
import { BANK_OPTIONS } from "./constants"; 

interface Props {
  setIsSimulated: (v: boolean) => void;
  data: UnifiedSimulatorState;
}

const bankMonthOptions = [12, 24, 36, 48, 60];

export const BankControls = ({ setIsSimulated, data }: Props) => {
  const { 
    inventory, selectedVehicle, vehiclePrice, downPaymentAmount, 
    downPaymentPercentage, termMonths, amortizationMethod, 
    selectedBankId, 
    updateField, updateDownPaymentByAmount 
  } = data;

  const inputBaseClasses = "w-full pl-11 pr-10 py-3 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#c22e2e] focus:ring-1 focus:ring-[#c22e2e] transition-all text-gray-700 text-sm font-medium shadow-sm cursor-pointer appearance-none";
  const banksList = Object.values(BANK_OPTIONS);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 0. SELECCIÓN DE BANCO */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Entidad Financiera</label>
        <div className="grid grid-cols-2 gap-2">
          {banksList.map((bank) => (
            <button
              key={bank.id}
              onClick={() => updateField("selectedBank", bank.id)}
              className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${
                selectedBankId === bank.id
                  ? "border-[#c22e2e] bg-red-50 text-[#c22e2e] ring-1 ring-[#c22e2e]"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="text-xs font-bold truncate">{bank.name}</div>
              <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                <span>Tasa: {bank.rate}%</span>
              </div>
              {selectedBankId === bank.id && (
                <div className="absolute top-1 right-1 text-[#c22e2e]">
                   <Building2 size={12} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 1. SELECCIÓN DE VEHÍCULO */}
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

      {/* 2. ENTRADA */}
      <div className={!selectedVehicle ? "opacity-50 pointer-events-none" : ""}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">Entrada inicial</label>
          <span className="text-[10px] px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
             {downPaymentPercentage <= 10 ? "¡Financiamiento 100%!" : "Crédito Flexible"}
          </span>
        </div>

        <div className="relative mb-3">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign size={16} /></div>
          <input
            type="number"
            value={selectedVehicle ? Math.round(downPaymentAmount) : 0}
            min={0}
            max={vehiclePrice * 0.9} 
            onChange={(e) => updateDownPaymentByAmount(Number(e.target.value))}
            className={`${inputBaseClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="Ej: 5000"
          />
        </div>
        
        {/* Slider */}
        <div className="relative w-full h-1 bg-gray-200 rounded-full mt-2">
           <div className="absolute h-full bg-[#c22e2e] rounded-full transition-all" style={{ width: `${(downPaymentPercentage / 80) * 100}%`, maxWidth: '100%' }} />
           <input
            type="range" min="0" max="80" step="5"
            value={Math.min(downPaymentPercentage, 80)}
            onChange={(e) => updateField("downPaymentPercentage", Number(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer inset-0"
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
           <span>0%</span>
           <span className="font-medium text-gray-600">{Math.round(downPaymentPercentage)}% entrada</span>
           <span>80%</span>
        </div>
      </div>

      {/* 3. PLAZO */}
      <div className={!selectedVehicle ? "opacity-50 pointer-events-none" : ""}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Plazo del crédito</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Calendar size={18} /></div>
          <select
            className={inputBaseClasses}
            value={termMonths}
            onChange={(e) => updateField("termMonths", Number(e.target.value))}
          >
            {bankMonthOptions.map((month) => (
              <option key={month} value={month}>{month} Meses ({month/12} años)</option>
            ))}
          </select>
           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDown size={16} /></div>
        </div>
      </div>

      {/* 4. AMORTIZACIÓN - CORREGIDO AQUÍ */}
      <div className={!selectedVehicle ? "opacity-50 pointer-events-none" : ""}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Sistema de Amortización</label>
        <div className="grid grid-cols-2 gap-3">
          
          {/* BOTÓN FRANCÉS */}
          <button
            // 🔥 CAMBIO: Usamos "french" (inglés) para coincidir con la lógica
            onClick={() => updateField("amortizationMethod", "french")}
            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                amortizationMethod === "french" // 🔥 CAMBIO
                ? "border-[#c22e2e] bg-red-50 text-[#c22e2e] ring-1 ring-[#c22e2e]" 
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span>Francesa</span>
            <span className="text-[10px] opacity-70 font-normal">Cuota Fija</span>
          </button>

          {/* BOTÓN ALEMÁN */}
          <button
            // 🔥 CAMBIO: Usamos "german" (inglés) para coincidir con la lógica
            onClick={() => updateField("amortizationMethod", "german")}
            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                amortizationMethod === "german" // 🔥 CAMBIO
                ? "border-[#c22e2e] bg-red-50 text-[#c22e2e] ring-1 ring-[#c22e2e]" 
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span>Alemana</span>
            <span className="text-[10px] opacity-70 font-normal">Cuota Variable</span>
          </button>
        </div>
      </div>

      <button 
        onClick={() => setIsSimulated(true)} 
        disabled={!selectedVehicle} 
        className={`w-full py-4 rounded-xl text-base font-bold transition-all mt-4 shadow-lg ${!selectedVehicle ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" : "bg-[#c22e2e] text-white hover:bg-[#a01b1b] hover:scale-[1.01]"}`}
      >
        Simular Crédito Bancario
      </button>
    </div>
  );
};