import { useState } from 'react';
import { X, Wand2, Calendar, DollarSign, Hash } from 'lucide-react';
import { addMonths, format } from 'date-fns';

interface GenerateAmortizationModalProps {
  onClose: () => void;
  onGenerate: (data: { monto: number; plazo: number; fechaInicio: string; interes: number }) => void;
}

export function GenerateAmortizationModal({ onClose, onGenerate }: GenerateAmortizationModalProps) {
  const [formData, setFormData] = useState({
    monto: '',
    plazo: '12',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    interesTotal: '0' // Interés fijo total a dividir, opcional
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
        monto: parseFloat(formData.monto),
        plazo: parseInt(formData.plazo),
        fechaInicio: formData.fechaInicio,
        interes: parseFloat(formData.interesTotal) || 0
    });
    onClose();
  };

  // Cálculo preliminar para mostrar al usuario cuánto saldrá la cuota
  const monto = parseFloat(formData.monto) || 0;
  const plazo = parseInt(formData.plazo) || 1;
  const interes = parseFloat(formData.interesTotal) || 0;
  const cuotaEstimada = (monto + interes) / plazo;

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
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Financiar (Saldo)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="number" step="0.01" required
                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.monto}
                        onChange={e => setFormData({...formData, monto: e.target.value})}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (Meses)</label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="number" required min="1" max="60"
                            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.plazo}
                            onChange={e => setFormData({...formData, plazo: e.target.value})}
                        />
                    </div>
                </div>
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

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interés Total a Repartir (Opcional)</label>
                <input 
                    type="number" step="0.01"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.interesTotal}
                    onChange={e => setFormData({...formData, interesTotal: e.target.value})}
                    placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">Si dejas 0, solo dividirá el capital.</p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Cuota Mensual Estimada</span>
                <div className="text-2xl font-bold text-blue-600">${cuotaEstimada.toFixed(2)}</div>
                <div className="text-xs text-gray-400">x {plazo} meses</div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition-all flex justify-center gap-2">
                <Wand2 size={20} />
                Generar {plazo} Cuotas
            </button>
        </form>
      </div>
    </div>
  );
}