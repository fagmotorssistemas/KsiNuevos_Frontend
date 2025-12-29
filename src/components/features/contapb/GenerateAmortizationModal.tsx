import { useState } from 'react';
import { X, Wand2, DollarSign, Hash, Percent, Settings2 } from 'lucide-react';
import { format } from 'date-fns';

interface GenerateAmortizationModalProps {
  onClose: () => void;
  onGenerate: (data: { monto: number; plazo: number; fechaInicio: string; tasa: number; tipo: 'LINEAR' | 'FRANCES' | 'ALEMAN' }) => void;
}

export function GenerateAmortizationModal({ onClose, onGenerate }: GenerateAmortizationModalProps) {
  const [formData, setFormData] = useState({
    monto: '',
    plazo: '12',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    tasaInteres: '1.5', // Default 1.5%
    tipoAmortizacion: 'LINEAR' as 'LINEAR' | 'FRANCES' | 'ALEMAN'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
        monto: parseFloat(formData.monto) || 0,
        plazo: parseInt(formData.plazo) || 1,
        fechaInicio: formData.fechaInicio,
        tasa: parseFloat(formData.tasaInteres) || 0,
        tipo: formData.tipoAmortizacion
    });
    onClose();
  };

  // Cálculos preliminares
  const monto = parseFloat(formData.monto) || 0;
  const plazo = parseInt(formData.plazo) || 1;
  const tasa = parseFloat(formData.tasaInteres) || 0;
  
  let cuotaEstimada = 0;
  let totalFinal = monto;
  let detalle = "";

  if (formData.tipoAmortizacion === 'LINEAR') {
      // CÁLCULO LINEAL (FLAT)
      // Interés Total = Capital * %Mensual * Meses
      const interesTotal = monto * (tasa / 100) * plazo;
      totalFinal = monto + interesTotal;
      cuotaEstimada = totalFinal / plazo;
      
      detalle = `Total a Pagar: $${totalFinal.toFixed(2)} (Incluye $${interesTotal.toFixed(2)} de interés)`;
  } else if (formData.tipoAmortizacion === 'FRANCES') {
      const i = tasa / 100;
      if (i > 0) {
        cuotaEstimada = monto * ( (i * Math.pow(1+i, plazo)) / (Math.pow(1+i, plazo) - 1) );
      } else {
        cuotaEstimada = monto / plazo;
      }
      detalle = "Cuota Fija (Amortización compuesta)";
  } else {
      // ALEMAN
      const cap = monto / plazo;
      const int = monto * (tasa / 100);
      cuotaEstimada = cap + int;
      detalle = "1ra Cuota (Decreciente)";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <Wand2 size={18} className="text-blue-500" />
            Generar Tabla Automática
          </h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <Settings2 size={12} /> Modelo de Cobro
                </label>
                <select 
                    className="w-full p-2 border rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                    value={formData.tipoAmortizacion}
                    onChange={(e) => setFormData({...formData, tipoAmortizacion: e.target.value as any})}
                >
                    <option value="LINEAR">Crédito Directo (Interés al Precio)</option>
                    <option value="FRANCES">Bancario (Francés)</option>
                    <option value="ALEMAN">Bancario (Alemán)</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Capital (Sin Interés)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="number" step="0.01" required
                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.monto}
                        onChange={e => setFormData({...formData, monto: e.target.value})}
                        placeholder="Ej: 10000"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (Meses)</label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="number" required min="1" max="120"
                            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.plazo}
                            onChange={e => setFormData({...formData, plazo: e.target.value})}
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tasa Mensual (%)</label>
                    <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="number" step="0.01"
                            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.tasaInteres}
                            onChange={e => setFormData({...formData, tasaInteres: e.target.value})}
                            placeholder="Ej: 1.5"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inicio Pagos</label>
                    <div className="relative">
                        <input 
                            type="date" required
                            className="w-full pl-3 pr-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={formData.fechaInicio}
                            onChange={e => setFormData({...formData, fechaInicio: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-blue-600/5 p-3 rounded-lg border border-blue-100 text-center space-y-2">
                <div>
                    <span className="text-xs text-blue-600 uppercase tracking-wide font-bold">Cuota Mensual Fija</span>
                    <div className="text-3xl font-bold text-blue-700">${cuotaEstimada.toFixed(2)}</div>
                </div>
                <div className="text-[11px] text-blue-500 bg-blue-100/50 p-2 rounded">
                    {detalle}
                </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition-all flex justify-center gap-2">
                <Wand2 size={20} />
                Generar Tabla
            </button>
        </form>
      </div>
    </div>
  );
}