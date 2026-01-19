'use client'

import React from 'react'
import type { SellRequestData } from '@/hooks/Homeksi/sell-actions'

interface StepProps {
  data: Partial<SellRequestData>
  update: (data: Partial<SellRequestData>) => void
}

export const Step2Condition = ({ data, update }: StepProps) => {
  return (
    <div className="p-6 space-y-6">
       <div className="text-center mb-4">
        <h4 className="text-xl font-bold text-gray-900">Estado y Precio</h4>
        <p className="text-sm text-gray-500">Ayúdanos a valorar tu auto correctamente</p>
      </div>

      {/* Toggles de Estado */}
      <div className="space-y-3">
        
        {/* Papeles al día */}
        <ToggleItem 
            title="¿Papeles al día?" 
            subtitle="Matrícula vigente, sin multas."
            checked={data.papers_ok !== false}
            onChange={(val) => update({ papers_ok: val })} 
        />

        {/* Único Dueño */}
        <ToggleItem 
            title="¿Eres único dueño?" 
            subtitle="Comprado de agencia por ti."
            checked={data.unique_owner || false}
            onChange={(val) => update({ unique_owner: val })}
        />

        {/* Choques */}
        <ToggleItem 
            title="¿Ha tenido choques?" 
            subtitle="Daños estructurales o chasis."
            checked={data.has_crashes || false}
            onChange={(val) => update({ has_crashes: val })}
            color="red"
        />

      </div>

      {/* Calificación 1-10 */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase text-gray-500">Estado Estético (1-10)</label>
              <span className="bg-black text-white text-xs font-bold px-2 py-1 rounded">
                  {data.state_rating || 5}/10
              </span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="10" 
            step="1"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            value={data.state_rating || 5}
            onChange={(e) => update({ state_rating: parseInt(e.target.value) })}
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
              <span>Malo</span>
              <span>Regular</span>
              <span>Excelente</span>
          </div>
      </div>

      {/* Precio Esperado */}
      <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">¿Cuánto esperas recibir? (USD)</label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-gray-400 font-bold">$</span>
            <input
                type="number"
                placeholder="0.00"
                className="w-full pl-8 bg-white border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold text-lg text-gray-900"
                value={data.client_asking_price || ''}
                onChange={(e) => update({ client_asking_price: parseInt(e.target.value) || 0 })}
            />
          </div>
      </div>

      {/* Descripción */}
      <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Detalles adicionales</label>
          <textarea
            rows={2}
            placeholder="Ej: Llantas nuevas, batería cambiada hace un mes..."
            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-black outline-none resize-none text-sm"
            value={data.description || ''}
            onChange={(e) => update({ description: e.target.value })}
          />
      </div>

    </div>
  )
}

// --- SOLUCIÓN: Definimos la interfaz para las Props ---
interface ToggleItemProps {
    title: string;
    subtitle: string;
    checked: boolean;
    // Aquí le decimos explícitamente que 'onChange' recibe un valor booleano
    onChange: (value: boolean) => void; 
    color?: 'green' | 'red';
}

const ToggleItem = ({ title, subtitle, checked, onChange, color = 'green' }: ToggleItemProps) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div>
        <p className="font-bold text-gray-900 text-sm">{title}</p>
        <p className="text-[10px] text-gray-500">{subtitle}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
        <input 
            type="checkbox" 
            className="sr-only peer"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${color === 'red' ? 'peer-checked:bg-red-600' : 'peer-checked:bg-green-500'}`}></div>
        </label>
    </div>
)