import React, { useState, useRef, useEffect } from "react";
import { Car, Calendar, ChevronDown, DollarSign, Building2, Search, CheckCircle2 } from "lucide-react";
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

  // ESTADOS PARA DROPDOWNS PERSONALIZADOS
  const [isVehiclesOpen, setIsVehiclesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTermOpen, setIsTermOpen] = useState(false);
  
  const vehicleRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);

  const inputBaseClasses = "w-full pl-11 pr-10 py-3 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#c22e2e] focus:ring-1 focus:ring-[#c22e2e] transition-all text-gray-700 text-sm font-medium shadow-sm cursor-pointer";
  const banksList = Object.values(BANK_OPTIONS);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (vehicleRef.current && !vehicleRef.current.contains(e.target as Node)) setIsVehiclesOpen(false);
      if (termRef.current && !termRef.current.contains(e.target as Node)) setIsTermOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredInventory = inventory.filter(car => 
    `${car.brand} ${car.model} ${car.year}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 0. SELECCIÓN DE BANCO */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Entidad Financiera</label>
          <span className="text-[9px] text-gray-400 font-black">PASO 1</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {banksList.map((bank) => (
            <button
              key={bank.id}
              onClick={() => updateField("selectedBank", bank.id)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                selectedBankId === bank.id
                  ? "border-[#c22e2e] bg-red-50 ring-1 ring-[#c22e2e]"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className={`text-xs font-bold truncate ${selectedBankId === bank.id ? "text-[#c22e2e]" : "text-gray-700"}`}>
                {bank.name}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5 font-medium">Tasa: {bank.rate}%</div>
              {selectedBankId === bank.id && (
                <Building2 size={14} className="absolute bottom-2 right-2 text-[#c22e2e] opacity-20" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 1. SELECCIÓN DE VEHÍCULO (Buscador Moderno) */}
      <div className="relative" ref={vehicleRef}>
        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight text-[11px]">Vehículo a financiar</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            {isVehiclesOpen ? <Search size={18} /> : <Car size={18} />}
          </div>
          <input
            type="text"
            className={inputBaseClasses}
            placeholder={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Buscar marca o modelo..."}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsVehiclesOpen(true); }}
            onFocus={() => setIsVehiclesOpen(true)}
          />
          {isVehiclesOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1">
              {filteredInventory.map(car => (
                <div 
                  key={car.id} 
                  onClick={() => { updateField("selectedVehicle", car); setIsVehiclesOpen(false); setSearchTerm(""); }}
                  className="p-3 hover:bg-red-50 rounded-lg cursor-pointer flex justify-between items-center group"
                >
                  <div className="text-sm font-bold text-gray-700 group-hover:text-[#c22e2e] uppercase">{car.brand} {car.model}</div>
                  <div className="text-xs font-bold text-gray-400">{car.year}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. ENTRADA CON SLIDER ESTILIZADO */}
      <div className={!selectedVehicle ? "opacity-40 pointer-events-none" : ""}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-tight text-[11px]">Monto de Entrada</label>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold border border-green-200">
             {downPaymentPercentage <= 10 ? "FINANCIA 100%" : "CRÉDITO FLEXIBLE"}
          </span>
        </div>

        <div className="relative mb-4">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign size={16} /></div>
          <input
            type="text"
            value={selectedVehicle ? Math.round(downPaymentAmount).toLocaleString() : ""}
            onChange={(e) => updateDownPaymentByAmount(Number(e.target.value.replace(/\D/g, "")))}
            className={`${inputBaseClasses} text-lg font-black`}
            placeholder="0"
          />
        </div>
        
        {/* Slider con Círculo (Thumb) */}
        <div className="px-1 relative h-6">
           <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-100 rounded-full">
              <div className="h-full bg-[#c22e2e] rounded-full" style={{ width: `${(downPaymentPercentage / 80) * 100}%` }} />
           </div>
           <input
            type="range" min="0" max="80" step="1"
            value={downPaymentPercentage}
            onChange={(e) => updateField("downPaymentPercentage", Number(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer z-20 inset-0"
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#c22e2e] rounded-full shadow-md z-10 pointer-events-none transition-all"
            style={{ left: `calc(${(downPaymentPercentage / 80) * 100}% - 10px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase mt-1">
           <span>0%</span>
           <span className="text-[#c22e2e] text-xs">{Math.round(downPaymentPercentage)}% SELECCIONADO</span>
           <span>80%</span>
        </div>
      </div>

      {/* 3. PLAZO (Grid de 2 Columnas) */}
      {/* 3. PLAZO (Dropdown Refinado) */}
    <div className={`relative ${!selectedVehicle ? "opacity-40 pointer-events-none" : ""}`} ref={termRef}>
      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight text-[11px]">
        Plazo del crédito
      </label>
      
      <button 
        type="button"
        onClick={() => setIsTermOpen(!isTermOpen)}
        className={`${inputBaseClasses} flex justify-between items-center hover:border-gray-400 active:scale-[0.99] transition-all`}
      >
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-[#c22e2e]" /> {/* Icono en color marca para que resalte */}
          <span className="text-gray-700 font-bold">{termMonths} Meses</span>
          <span className="text-[10px] text-gray-400 font-medium">({termMonths / 12} años)</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isTermOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menú Desplegable con "Z-Index" alto y Animación */}
      {isTermOpen && (
        <div className="absolute left-0 right-0 z-[100] mt-2 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] p-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {bankMonthOptions.map(month => (
              <button
                key={month}
                type="button"
                onClick={() => { updateField("termMonths", month); setIsTermOpen(false); }}
                className={`group relative flex flex-col items-center justify-center py-4 rounded-xl transition-all border ${
                  termMonths === month 
                    ? 'bg-[#c22e2e] border-[#c22e2e] text-white shadow-lg shadow-red-200' 
                    : 'bg-white border-gray-100 text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-[#c22e2e]'
                }`}
              >
                <span className="text-sm font-black">{month}</span>
                <span className={`text-[9px] uppercase font-bold ${termMonths === month ? 'text-red-100' : 'text-gray-400'}`}>
                  Meses
                </span>
              </button>
            ))}
          </div>
          
          {/* Indicador visual de que es una lista */}
          <div className="mt-2 pt-2 border-t border-gray-50 text-center">
            <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Selecciona el tiempo de pago</span>
          </div>
        </div>
      )}
    </div>

      {/* 4. AMORTIZACIÓN */}
      {/* 4. AMORTIZACIÓN */}
    <div className={!selectedVehicle ? "opacity-40 pointer-events-none" : "transition-opacity duration-300"}>
      <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-tight text-[11px]">
        Sistema de Amortización
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "french", label: "Francesa", sub: "Cuota Fija" },
          { id: "german", label: "Alemana", sub: "Cuota Variable" }
          ].map((method) => {

          // Normalizamos el valor actual a string minúscula para comparar
          const currentVal = String(amortizationMethod || "").toLowerCase();

          // Determinamos si este botón debe estar activo (soportando legacy en español)
          let isActive = false;

          if (method.id === "german") {
            isActive = currentVal === "german" || currentVal === "aleman" || currentVal === "alem";
          } else {
            isActive = currentVal === "french" || currentVal === "frances" || currentVal === "francesa" || currentVal === "";
          }

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => {
                // Guardamos el valor canónico ('french' | 'german') en el store
                const valueToSet = method.id === 'german' ? 'german' : 'french';
                updateField('amortizationMethod', valueToSet);
              }}
              className={`relative px-4 py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 group ${
                isActive
                  ? "border-[#c22e2e] bg-red-50 text-[#c22e2e] shadow-sm"
                  : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
              }`}
            >
              <span className={`text-sm font-black ${isActive ? "text-[#c22e2e]" : "text-gray-700"}`}>
                {method.label}
              </span>
              <span className={`text-[9px] uppercase font-bold tracking-tighter ${isActive ? "opacity-80" : "opacity-40"}`}>
                {method.sub}
              </span>
              
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-[#c22e2e] rounded-full animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>

      <button 
        onClick={() => setIsSimulated(true)} 
        disabled={!selectedVehicle} 
        className={`w-full py-4 rounded-xl text-base font-black transition-all mt-4 active:scale-95 shadow-xl ${
          !selectedVehicle 
          ? "bg-gray-100 text-gray-400" 
          : "bg-[#c22e2e] text-white hover:bg-[#a01b1b] shadow-red-900/20"
        }`}
      >
        Simular Crédito Bancario
      </button>
    </div>
  );
};