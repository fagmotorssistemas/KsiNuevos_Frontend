'use client'

import React from 'react'

interface Option {
  label: string
  value: string
}

interface SelectorColumnProps {
  title: string
  options: Option[]
  selectedValue: string
  onSelect: (val: string) => void
  emptyMessage?: React.ReactNode
}

export const SelectorColumn = ({ 
  title, 
  options, 
  selectedValue, 
  onSelect, 
  emptyMessage 
}: SelectorColumnProps) => {
  return (
    <div className="flex flex-col border-r border-gray-200 last:border-r-0 overflow-hidden h-full text-black">
      {/* Título de Columna */}
      <div className="text-center py-2 text-[10px] font-bold text-black uppercase tracking-widest bg-white z-10 shadow-sm">
        {title}
      </div>
      
      {/* Lista Scrollable */}
      <div className="overflow-y-auto custom-scrollbar flex-grow py-8 space-y-1 px-1 text-center relative">
        {options.length === 0 && emptyMessage ? (
           <div className="h-full flex items-center justify-center">
             {emptyMessage}
           </div>
        ) : (
          options.map((opt) => {
            const isSelected = selectedValue === opt.value;

            // Lógica de estilos UNIFICADA
            // Ahora Días, Horas y Minutos se ven idénticos al seleccionarse
            let activeClass = "";
            
            if (isSelected) {
                // Estilo SELECCIONADO (Igual para todos: Blanco con texto negro y borde)
                activeClass = "bg-white text-black font-bold shadow-sm ring-1 ring-gray-200 scale-100 z-10";
            } else {
                // Estilo NO SELECCIONADO (Gris y un poco más pequeño)
                activeClass = "text-gray-400 hover:text-gray-600 scale-95 font-medium";
            }

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(opt.value)}
                className={`
                  w-full py-2.5 px-2 rounded-lg text-sm transition-all duration-200 block
                  ${activeClass}
                `}
              >
                {/* Agregamos los dos puntos ':' solo si es columna de minutos */}
                {title === 'Min' ? `:${opt.label}` : opt.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  )
}