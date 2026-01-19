import React from 'react';
import { ContractData, ContractType } from '@/types/contracts';
import { Input } from '@/components/ui/Input'; 

interface Props {
  type: ContractType;
  data: ContractData;
  onChange: (data: ContractData) => void;
}

export default function ContractForm({ type, data, onChange }: Props) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    const numericFields = ['carPrice', 'downPayment', 'months', 'monthlyInstallment', 'creditAmount'];
    const numericValue = parseFloat(value);
    const finalValue = numericFields.includes(name) ? (isNaN(numericValue) ? 0 : numericValue) : value;

    let newData = { ...data, [name]: finalValue };
    
    // CASO 1: Cambio de Precio
    if (name === 'carPrice' && type === 'credit') {
       const price = typeof finalValue === 'number' ? finalValue : 0;
       // 60% sugerido
       const suggestedDownPayment = price * 0.60;
       newData.downPayment = suggestedDownPayment;
       newData.creditAmount = price - suggestedDownPayment;
       // Nota: No tocamos los meses aquí, mantenemos los que estén (o 36 por defecto)
    }

    // CASO 2: Cambio de Entrada Manual
    if (name === 'downPayment' && type === 'credit') {
       const down = typeof finalValue === 'number' ? finalValue : 0;
       const price = data.carPrice || 0;
       newData.creditAmount = price - down;
    }

    // CASO 3: Cambio de Meses (Nuevo)
    // No requiere lógica especial aquí porque el hook se encarga del cálculo financiero,
    // solo aseguramos que el valor pase al estado (ya lo hace la línea 'let newData...').

    onChange(newData);
  };

  return (
    <div className="space-y-6">
      {/* ... Sección Cliente y Vehículo (sin cambios) ... */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 border-b pb-2">Información del Cliente</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <label className="text-sm font-medium">Nombre Completo</label>
                <Input name="clientName" value={data.clientName} onChange={handleChange} placeholder="Ej: Juan Pérez" />
            </div>
            {/* ... resto de inputs de cliente y vehículo ... */}
        </div>
        {/* Agrego los inputs de vehículo resumidos para no perder contexto en el copy-paste */}
        <div className="space-y-4 mt-4">
             <h3 className="font-semibold text-gray-900 border-b pb-2">Datos del Vehículo</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Placa</label>
                    <Input name="carPlate" value={data.carPlate} onChange={handleChange} className="uppercase" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Precio Total ($)</label>
                    <Input name="carPrice" type="number" value={data.carPrice} onChange={handleChange} className="font-bold" />
                </div>
                {/* ... resto ... */}
             </div>
        </div>
      </div>

      {/* Sección 3: Valores Económicos */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 border-b pb-2">
            {type === 'cash' ? 'Valor a Pagar' : 'Financiamiento'}
        </h3>
        
        {type === 'credit' && (
             <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="space-y-2">
                    <label className="text-sm font-medium flex justify-between">
                        Entrada Inicial ($)
                        <span className="text-[10px] text-gray-500 font-normal mt-1">Sugerido: 60%</span>
                    </label>
                    <Input 
                        name="downPayment" 
                        type="number" 
                        value={data.downPayment || 0} 
                        onChange={handleChange} 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Saldo a Financiar</label>
                    <Input 
                        name="creditAmount" 
                        type="number" 
                        value={data.creditAmount || 0} 
                        readOnly 
                        className="bg-gray-200 text-gray-600 cursor-not-allowed"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Plazo (Meses)</label>
                    {/* CAMBIO: Quitamos readOnly y bg-gray-100 */}
                    <Input 
                        name="months" 
                        type="number" 
                        value={data.months || 36} 
                        onChange={handleChange} 
                        className="font-bold"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Cuota Mensual Aprox.</label>
                    <Input 
                        name="monthlyInstallment" 
                        type="number" 
                        value={data.monthlyInstallment || 0} 
                        readOnly
                        className="font-bold text-blue-700 bg-blue-100 border-blue-300"
                    />
                </div>
             </div>
        )}
      </div>
    </div>
  );
}