import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, Car, Calendar, ChevronDown, DollarSign, Search } from "lucide-react";
import { formatMoney } from "../simulator.utils";
import { monthOptions } from "../simulator.constants";
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

  // Estados para el buscador personalizado
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isTermOpen, setIsTermOpen] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  const inputBaseClasses = "w-full pl-11 pr-10 py-3 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#c22e2e] focus:ring-1 focus:ring-[#c22e2e] transition-all text-gray-700 text-sm font-medium shadow-sm cursor-pointer";

  // Y en el useEffect que cierra los menús al hacer click afuera, añade el termRef:
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (termRef.current && !termRef.current.contains(event.target as Node)) {
        setIsTermOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

   // Filtrar inventario por marca, modelo o año
  const filteredInventory = inventory.filter(car => 
    `${car.brand} ${car.model} ${car.year}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SELECCIÓN CON BUSCADOR */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Elige tu vehículo para continuar...</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            {isOpen ? <Search size={18} /> : <Car size={18} />}
          </div>
          
          <input
            type="text"
            className={inputBaseClasses}
            placeholder={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Buscar por marca o modelo..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Lista Desplegable Moderna */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((car) => (
                  <div
                    key={car.id}
                    className="px-4 py-3 hover:bg-red-50 cursor-pointer transition-colors border-b border-gray-50 last:border-none flex justify-between items-center"
                    onClick={() => {
                      updateField("selectedVehicle", car);
                      setSearchTerm("");
                      setIsOpen(false);
                    }}
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-800 uppercase">{car.brand} {car.model}</div>
                      <div className="text-xs text-gray-500">Año: {car.year}</div>
                    </div>
                    <div className="text-sm font-semibold text-[#c22e2e]">
                      {formatMoney(car.price)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">No se encontraron resultados</div>
              )}
            </div>
          )}
        </div>
        
        {selectedVehicle && !isOpen && (
           <div className="mt-2 text-right text-xs">
             <span className="font-medium text-gray-500">Precio seleccionado: </span>
             <span className="font-bold text-gray-800">{formatMoney(selectedVehicle.price)}</span>
           </div>
        )}
      </div>

      {/* 2. ENTRADA (Mínimo 60%) */}
      {/* 2. ENTRADA (Híbrida: Escritura + Slider con Thumb) */}
    <div className={!selectedVehicle ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-gray-700">Entrada inicial</label>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shadow-sm ${downPaymentPercentage >= 60 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          MÍNIMO 60%
        </span>
      </div>

    {/* Campo de texto para escribir el monto */}
    <div className="relative mb-4">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
        <DollarSign size={16} />
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={selectedVehicle ? Math.round(downPaymentAmount).toLocaleString('en-US') : ""}
        onChange={(e) => {
          // Permitir solo números
          const val = e.target.value.replace(/\D/g, "");
          updateDownPaymentByAmount(Number(val));
        }}
        className={`${inputBaseClasses} font-bold text-lg text-slate-800`}
        placeholder="0"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <span className="text-[10px] text-gray-400 font-bold mr-1">USD</span>
        {downPaymentPercentage >= 60 && <CheckCircle2 size={18} className="text-green-500" />}
      </div>
    </div>

  {/* Slider con Círculo (Thumb) Visible */}
  <div className="px-1 mb-6">
    <div className="relative w-full h-2 bg-gray-200 rounded-full">
      {/* Progreso de la barra */}
      <div 
        className="absolute h-full bg-[#c22e2e] rounded-full" 
        style={{ width: `${((downPaymentPercentage - 60) / 30) * 100}%` }} 
      />
      
      {/* Input Range oculto pero con Thumb estilizado */}
      <input
        type="range"
        min="60"
        max="90"
        step="1"
        value={downPaymentPercentage < 60 ? 60 : downPaymentPercentage}
        onChange={(e) => updateField("downPaymentPercentage", Number(e.target.value))}
        className="absolute w-full h-full opacity-0 cursor-pointer z-20 inset-0"
      />
      
      {/* El Círculo (Thumb) visual que sigue al valor */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#c22e2e] rounded-full shadow-md z-10 pointer-events-none transition-all duration-75"
        style={{ left: `calc(${((downPaymentPercentage - 60) / 30) * 100}% - 10px)` }}
      />
    </div>
    
    <div className="flex justify-between mt-3 px-0.5">
        <div className="text-[10px] text-gray-400 font-bold leading-tight">
          ARRASTRE PARA<br/>AJUSTAR MONTO
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-[#c22e2e]">{downPaymentPercentage}%</span>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Seleccionado</p>
        </div>
        </div>
      </div>
    </div>

      {/* 3. PLAZO DE PAGO (Dropdown Estilizado) */}
      <div className={`relative ${!selectedVehicle ? "opacity-40 pointer-events-none" : ""}`}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Plazo de pago</label>
        
        <div className="relative" ref={termRef}> {/* Necesitarás crear este ref con useRef similar al del buscador */}
          <button
            type="button"
            onClick={() => setIsTermOpen(!isTermOpen)}
            className={`${inputBaseClasses} flex items-center justify-between bg-white`}
          >
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" />
              <span className="text-gray-700">{termMonths} Meses</span>
            </div>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform ${isTermOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Menú desplegable bonito */}
          {isTermOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-2 grid grid-cols-2 gap-1">
              {monthOptions.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    updateField("termMonths", month);
                    setIsTermOpen(false);
                  }}
                  className={`flex items-center justify-center py-3 rounded-lg text-sm font-bold transition-all ${
                    termMonths === month 
                      ? "bg-[#c22e2e] text-white shadow-md shadow-red-200" 
                      : "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-[#c22e2e]"
                  }`}
                >
                  {month} <span className="ml-1 font-normal opacity-80 text-[10px]">Meses</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={() => setIsSimulated(true)} 
        disabled={!selectedVehicle || downPaymentPercentage < 60} 
        className={`w-full py-4 rounded-xl text-sm font-bold transition-all mt-2 active:scale-[0.98] ${
          !selectedVehicle || downPaymentPercentage < 60
          ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
          : "bg-[#c22e2e] text-white hover:bg-[#a52626] shadow-lg shadow-red-900/20"
        }`}
      >
        Calcular Cuotas Mensuales
      </button>
    </div>
  );
};