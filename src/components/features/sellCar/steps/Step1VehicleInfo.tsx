'use client'

import React from 'react'
import type { SellRequestData } from '@/hooks/Homeksi/sell-actions'

interface StepProps {
  data: Partial<SellRequestData>
  update: (data: Partial<SellRequestData>) => void
}

export const Step1VehicleInfo = ({ data, update }: StepProps) => {
  
  // Verificamos si ya vienen los datos desde el Hero
  const hasBasicInfo = data.brand && data.model && data.year;

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-2">
        <h4 className="text-xl font-bold text-gray-900">Detalles del Vehículo</h4>
        <p className="text-sm text-gray-500">Completa la información técnica</p>
      </div>

      {/* --- LÓGICA CONDICIONAL --- */}
      {hasBasicInfo ? (
        // OPCIÓN A: Si YA tenemos datos (Viene del Hero), mostramos un resumen bonito
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between mb-4">
            <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Cotizando:</p>
                <h3 className="text-lg font-black text-gray-900">
                    {data.brand} {data.model} <span className="text-gray-500">{data.year}</span>
                </h3>
            </div>
            {/* Botón discreto por si se equivocaron en el Hero y quieren corregir */}
            <button 
                onClick={() => update({ brand: '', model: '' })} // Esto borra los datos y hará aparecer los inputs de abajo
                className="text-xs font-bold text-gray-400 underline hover:text-red-600"
            >
                Cambiar
            </button>
        </div>
      ) : (
        // OPCIÓN B: Si NO tenemos datos, mostramos los inputs (Igual que antes)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
             <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Marca</label>
                <input
                    type="text"
                    placeholder="Ej: Toyota"
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none font-bold text-gray-900"
                    value={data.brand || ''}
                    onChange={(e) => update({ brand: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Modelo</label>
                <input
                    type="text"
                    placeholder="Ej: Fortuner"
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none font-bold text-gray-900"
                    value={data.model || ''}
                    onChange={(e) => update({ model: e.target.value })}
                />
            </div>
            <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Año</label>
                <input
                    type="number"
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none font-bold text-gray-900"
                    value={data.year || ''}
                    onChange={(e) => update({ year: parseInt(e.target.value) || 2024 })}
                />
            </div>
        </div>
      )}

      {/* --- EL RESTO DEL FORMULARIO (Siempre visible) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kilometraje */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Kilometraje</label>
          <input
            type="number"
            placeholder="Ej: 45000"
            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none font-bold"
            value={data.mileage || ''}
            onChange={(e) => update({ mileage: parseInt(e.target.value) || 0 })}
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Color</label>
          <input
            type="text"
            placeholder="Ej: Rojo, Plata, Blanco..."
            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
            value={data.color || ''}
            onChange={(e) => update({ color: e.target.value })}
          />
        </div>

        {/* Transmisión */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Transmisión</label>
          <div className="grid grid-cols-3 gap-3">
            {['Manual', 'Automática', 'Híbrida'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => update({ transmission: type })}
                className={`py-3 px-2 rounded-xl border transition-all font-medium text-sm ${
                  data.transmission === type
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Placa */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Placa (Letra / Dígito)</label>
          <div className="flex gap-4">
              <div className="flex-1 relative">
                  <span className="absolute left-3 top-3 text-gray-400 text-xs font-bold">LETRA</span>
                  <input 
                    type="text" 
                    maxLength={1}
                    placeholder="P"
                    className="w-full pl-12 bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none uppercase font-bold text-center"
                    value={data.plate_first_letter || ''}
                    onChange={(e) => update({ plate_first_letter: e.target.value.toUpperCase() })}
                  />
              </div>
              <div className="flex-1 relative">
                  <span className="absolute left-3 top-3 text-gray-400 text-xs font-bold">DÍGITO</span>
                  <select
                    className="w-full pl-12 bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none appearance-none font-bold text-center"
                    value={data.plate_last_digit || ''}
                    onChange={(e) => update({ plate_last_digit: e.target.value })}
                  >
                    <option value="">-</option>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
              </div>
          </div>
        </div>

      </div>
    </div>
  )
}