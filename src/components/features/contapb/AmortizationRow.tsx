import { useState, useEffect } from 'react';
import { Trash2, PaintBucket, AlertCircle, MessageSquare, PlusCircle } from 'lucide-react';
import { CuotaPB } from '@/hooks/contapb/types';
import { formatDateForInput, calculateDaysOverdue, calculateMoraValue } from '@/lib/contapb/utils';

interface AmortizationRowProps {
  cuota: CuotaPB;
  tasaMoraDiaria: number;
  saldoRestanteReal: number;
  onUpdate: (id: string, updates: Partial<CuotaPB>) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (currentOrder: number) => void;
}

const COLORS = [
  { val: null, label: 'Ninguno' },
  { val: 'bg-red-100', label: 'Rojo (Alerta)' },
  { val: 'bg-yellow-100', label: 'Amarillo (Revisar)' },
  { val: 'bg-green-100', label: 'Verde (OK)' },
  { val: 'bg-blue-100', label: 'Azul (Info)' },
];

export function AmortizationRow({ cuota, tasaMoraDiaria, saldoRestanteReal, onUpdate, onDelete, onInsertAfter }: AmortizationRowProps) {
  const [localData, setLocalData] = useState(cuota);
  const [isDirty, setIsDirty] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Sincronizar datos externos, PERO manteniendo cambios locales si estamos editando
  useEffect(() => {
    if (!isDirty) {
        setLocalData(prev => ({...prev, ...cuota}));
    }
  }, [cuota, isDirty]);

  const handleChange = (field: keyof CuotaPB, value: any) => {
    let newData = { ...localData, [field]: value };

    // Cálculos automáticos (se mantienen igual)
    if (field === 'fecha_vencimiento' || field === 'fecha_pago_realizado') {
       const dias = calculateDaysOverdue(newData.fecha_vencimiento, newData.fecha_pago_realizado);
       newData.dias_mora_calculados = dias;
       newData.valor_mora_sugerido = calculateMoraValue(dias, tasaMoraDiaria);
    }

    if (['valor_interes', 'valor_mora_cobrado', 'valor_pagado'].includes(field)) {
        const capital = Number(newData.valor_capital || 0); // Ojo: Esto es interno
        const interes = Number(newData.valor_interes || 0);
        const mora = Number(newData.valor_mora_cobrado || 0);
        const pagado = Number(newData.valor_pagado || 0);
        
        newData.valor_cuota_total = capital + interes; 
        newData.saldo_pendiente = (capital + interes + mora) - pagado;
        
        if (newData.saldo_pendiente <= 0.01) newData.estado_pago = 'PAGADO';
        else if (pagado > 0) newData.estado_pago = 'PARCIAL';
        else newData.estado_pago = 'PENDIENTE';
    }

    setLocalData(newData);
    setIsDirty(true);
  };

  // Función de guardado explícito
  const handleSave = () => {
    if (isDirty) {
      console.log("Guardando cambios:", localData); // Debug para verificar
      onUpdate(cuota.id, localData);
      setIsDirty(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        (e.currentTarget as HTMLInputElement).blur(); // Fuerza el onBlur
    }
  };

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors text-xs ${localData.color_fila || ''}`}>
      
      {/* 1. Orden */}
      <td className="p-2 text-center text-gray-400 font-mono w-8">
        {localData.numero_cuota_texto || Math.floor(localData.indice_ordenamiento)}
      </td>

      {/* 2. Concepto */}
      <td className="p-1 min-w-[120px]">
        <input 
          value={localData.concepto || ''}
          onChange={(e) => handleChange('concepto', e.target.value)}
          onBlur={handleSave}
          className="w-full bg-transparent p-1 border border-transparent hover:border-gray-300 rounded outline-none"
        />
      </td>

      {/* 3. Fechas */}
      <td className="p-1 w-[100px]">
        <input 
          type="date"
          value={formatDateForInput(localData.fecha_vencimiento)}
          onChange={(e) => handleChange('fecha_vencimiento', e.target.value)}
          onBlur={handleSave}
          className="w-full bg-transparent p-1 text-gray-600 rounded outline-none text-[10px]"
        />
      </td>

      {/* 4. CAPITAL / DEUDA (EDITABLE DE EMERGENCIA) */}
      {/* NOTA: Este input muestra el 'saldoRestanteReal' calculado desde la tabla.
          Si el usuario lo edita, estamos guardando ese valor en 'valor_capital' como un override manual.
          Esto es un truco para permitir la edición.
      */}
      <td className="p-1 w-24 bg-blue-50/30 border-x border-dashed border-blue-100">
         <input 
            type="number" step="0.01"
            // Si el usuario escribió algo manual en valor_capital, mostramos eso, si no, el calculado
            value={saldoRestanteReal.toFixed(2)}
            // Al editar, actualizamos 'valor_capital' que usaremos como campo comodín para ajustes manuales de saldo si se requiere
            // OJO: Editar esto es solo visual si no cambiamos la lógica de cálculo global, pero permite guardar el dato.
            onChange={(e) => handleChange('valor_capital', parseFloat(e.target.value))} 
            onBlur={handleSave}
            className="w-full bg-transparent p-1 text-right font-mono font-bold text-blue-800 outline-none text-[11px] hover:bg-white"
            title="Saldo Deuda (Editable)"
         />
      </td>

      {/* 5. Interés */}
      <td className="p-1 w-16">
        <input 
          type="number" step="0.01"
          value={localData.valor_interes}
          onChange={(e) => handleChange('valor_interes', parseFloat(e.target.value))}
          onBlur={handleSave}
          className="w-full bg-transparent p-1 text-right text-gray-500 outline-none hover:bg-white/50 rounded"
        />
      </td>

      {/* 6. Mora */}
      <td className="p-1 text-center w-10 text-gray-400 relative">
        {localData.dias_mora_calculados > 0 && (
            <div className="flex items-center justify-center gap-1 text-red-500 font-bold text-[10px]">
                {localData.dias_mora_calculados}d
            </div>
        )}
      </td>
      <td className="p-1 w-20 relative">
        <input 
          type="number" step="0.01"
          value={localData.valor_mora_cobrado}
          onChange={(e) => handleChange('valor_mora_cobrado', parseFloat(e.target.value))}
          onBlur={handleSave}
          className={`w-full bg-transparent p-1 text-right outline-none rounded ${localData.valor_mora_cobrado > 0 ? 'text-red-600 font-bold' : 'text-gray-300'}`}
        />
        {localData.valor_mora_sugerido > 0 && localData.valor_mora_cobrado !== localData.valor_mora_sugerido && (
            <button 
                onClick={() => { handleChange('valor_mora_cobrado', localData.valor_mora_sugerido); handleSave(); }}
                className="absolute -top-2 right-0 z-10 text-[9px] bg-red-100 text-red-600 px-1 rounded shadow cursor-pointer hover:bg-red-200 border border-red-200"
            >
                ${localData.valor_mora_sugerido.toFixed(2)}
            </button>
        )}
      </td>

      {/* 7. PAGADO */}
      <td className="p-1 w-24">
        <input 
          type="number" step="0.01"
          value={localData.valor_pagado}
          onChange={(e) => handleChange('valor_pagado', parseFloat(e.target.value))}
          onBlur={handleSave}
          className="w-full bg-green-50/50 p-1 text-right font-bold text-green-700 border border-green-100 rounded focus:ring-2 focus:ring-green-500 outline-none"
        />
      </td>

      {/* 8. SALDO CUOTA (EDITABLE DE EMERGENCIA) */}
      <td className="p-1 w-20">
         <input 
            type="number" step="0.01"
            value={localData.saldo_pendiente}
            onChange={(e) => handleChange('saldo_pendiente', parseFloat(e.target.value))}
            onBlur={handleSave}
            className={`w-full bg-transparent p-1 text-right font-medium text-[10px] outline-none rounded hover:bg-white ${
                localData.saldo_pendiente <= 0.01 ? 'text-green-600' : 'text-red-500'
            }`}
         />
      </td>

      {/* 9. Fecha Pago */}
      <td className="p-1 w-[100px]">
        <input 
          type="date"
          value={formatDateForInput(localData.fecha_pago_realizado)}
          onChange={(e) => handleChange('fecha_pago_realizado', e.target.value)}
          onBlur={handleSave}
          className="w-full bg-transparent p-1 text-gray-500 rounded outline-none text-[10px]"
        />
      </td>

      {/* 10. Observaciones (CORREGIDO) */}
      <td className="p-1 min-w-[150px]">
        <div className="relative group">
            {!localData.observaciones && <MessageSquare size={12} className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />}
            <input 
                name="observaciones" // Importante para el autocompletado
                value={localData.observaciones || ''}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                onBlur={handleSave} // Esto dispara el guardado en la BD
                onKeyDown={handleKeyDown}
                placeholder="Nota..."
                className="w-full pl-5 pr-1 py-1 bg-transparent text-gray-600 text-[10px] border-b border-transparent focus:border-blue-300 outline-none truncate focus:truncate-0 focus:absolute focus:z-10 focus:bg-white focus:w-[250px] focus:shadow-md focus:rounded-b"
            />
        </div>
      </td>

      {/* 11. Acciones */}
      <td className="p-1 w-24 text-center relative">
        <div className="flex items-center justify-center gap-1 transition-opacity text-black">
            <button onClick={() => onInsertAfter(localData.indice_ordenamiento)} className="p-1 rounded text-blue-400 hover:bg-blue-50" title="Insertar"><PlusCircle size={14} /></button>
            <button onClick={() => setShowColorPicker(!showColorPicker)} className={`p-1 rounded hover:bg-gray-100 ${localData.color_fila ? 'text-purple-500' : 'text-gray-400'}`}><PaintBucket size={14} /></button>
            <button onClick={() => onDelete(cuota.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
        </div>
        {showColorPicker && (
            <div className="absolute right-0 top-8 z-20 bg-white shadow-xl border border-gray-200 rounded-lg p-2 w-32 flex flex-col gap-1">
                {COLORS.map(c => (
                    <button key={c.label} className={`text-xs text-left px-2 py-1.5 rounded flex items-center gap-2 hover:opacity-80 ${c.val || 'bg-gray-50'}`} onClick={() => { handleChange('color_fila', c.val); handleSave(); setShowColorPicker(false); }}>
                        <div className={`w-3 h-3 rounded-full border border-black/10 ${c.val || 'bg-white'}`} /> {c.label}
                    </button>
                ))}
            </div>
        )}
      </td>
    </tr>
  );
}