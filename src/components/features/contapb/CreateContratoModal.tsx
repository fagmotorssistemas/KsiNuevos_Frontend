import { useState } from 'react';
import { X, Save, Loader2, Car, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CreateContratoModalProps {
    clienteId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateContratoModal({ clienteId, onClose, onSuccess }: CreateContratoModalProps) {
    const { supabase } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        numero_contrato: '',
        alias_vehiculo: '', // Ej: Ford Raptor 2020
        placa: '',
        chasis: '',
        marca: '',
        saldo_inicial_total: '', // Opcional
        tasa_mora_diaria: '0' // Por defecto 0
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación mínima: Al menos un identificador
        if (!formData.alias_vehiculo && !formData.numero_contrato) {
            alert("Debes poner al menos un Alias (Ej: Marca Modelo) o Número de Contrato");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('contratospb')
                .insert([{
                    cliente_id: clienteId,
                    numero_contrato: formData.numero_contrato || null,
                    alias_vehiculo: formData.alias_vehiculo || 'Vehículo Sin Nombre',
                    placa: formData.placa || null,
                    chasis: formData.chasis || null,
                    marca: formData.marca || null,
                    saldo_inicial_total: formData.saldo_inicial_total ? parseFloat(formData.saldo_inicial_total) : 0,
                    tasa_mora_diaria: formData.tasa_mora_diaria ? parseFloat(formData.tasa_mora_diaria) : 0,
                    estado: 'ACTIVO'
                }]);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creando contrato:', error);
            alert('Error al guardar el contrato');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Nuevo Contrato / Vehículo</h2>
                        <p className="text-sm text-gray-500">Registra el bien o crédito asociado</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto">
                    <form id="create-contrato-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Identificadores Principales */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alias / Vehículo *</label>
                                <div className="relative">
                                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        name="alias_vehiculo"
                                        value={formData.alias_vehiculo}
                                        onChange={handleChange}
                                        placeholder="Ej: Chevrolet D-Max 2022"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nº Contrato</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        name="numero_contrato"
                                        value={formData.numero_contrato}
                                        onChange={handleChange}
                                        placeholder="Ej: 1318"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                                <input
                                    name="placa"
                                    value={formData.placa}
                                    onChange={handleChange}
                                    placeholder="ABC-1234"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                />
                            </div>
                        </div>

                        {/* Detalles Técnicos */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                            <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Detalles Técnicos (Opcional)
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                                <input
                                    name="marca"
                                    value={formData.marca}
                                    onChange={handleChange}
                                    placeholder="Toyota"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chasis</label>
                                <input
                                    name="chasis"
                                    value={formData.chasis}
                                    onChange={handleChange}
                                    placeholder="..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                />
                            </div>
                        </div>

                        {/* Configuración Financiera */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-4">
                            <div className="col-span-2 flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span className="text-sm font-bold text-blue-800">Configuración de Cobro</span>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-blue-700 mb-1">Tasa Mora Diaria ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="tasa_mora_diaria"
                                    value={formData.tasa_mora_diaria}
                                    onChange={handleChange}
                                    className="w-full px-3 py-1.5 rounded bg-white border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-blue-700 mb-1">Saldo Inicial Total</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="saldo_inicial_total"
                                    value={formData.saldo_inicial_total}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="w-full px-3 py-1.5 rounded bg-white border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="create-contrato-form"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Crear Contrato
                    </button>
                </div>

            </div>
        </div>
    );
}