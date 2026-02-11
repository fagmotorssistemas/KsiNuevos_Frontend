"use client";

import { useState } from "react";
import { X, Save, Loader2, CreditCard, Wallet } from "lucide-react";

interface CreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<any>;
}

export function CreateAccountModal({ isOpen, onClose, onSave }: CreateAccountModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // Estado del formulario
    const [nombre, setNombre] = useState('');
    const [numero, setNumero] = useState('');
    const [saldoInicial, setSaldoInicial] = useState('');
    const [esCajaChica, setEsCajaChica] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        await onSave({
            nombre_cuenta: nombre,
            numero_cuenta: numero,
            saldo_actual: parseFloat(saldoInicial) || 0,
            es_caja_chica: esCajaChica
        });

        setIsLoading(false);
        onClose();
        // Reset form
        setNombre('');
        setNumero('');
        setSaldoInicial('');
        setEsCajaChica(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {esCajaChica ? <Wallet className="h-5 w-5 text-emerald-600" /> : <CreditCard className="h-5 w-5 text-blue-600" />}
                        Nueva Cuenta
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    
                    {/* Checkbox Tipo de Cuenta */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <input 
                            type="checkbox" 
                            id="esCajaChica"
                            checked={esCajaChica}
                            onChange={(e) => setEsCajaChica(e.target.checked)}
                            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                        />
                        <label htmlFor="esCajaChica" className="cursor-pointer">
                            <span className="block font-bold text-slate-700 text-sm">¿Es Caja Chica / Efectivo?</span>
                            <span className="block text-xs text-slate-400">Marcar si es dinero físico, desmarcar para Bancos.</span>
                        </label>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre de la Cuenta</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Banco Pichincha Principal"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Número (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                placeholder="**** 1234"
                                value={numero}
                                onChange={(e) => setNumero(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Saldo Inicial ($)</label>
                            <input 
                                required
                                type="number" 
                                min="0" 
                                step="0.01"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                placeholder="0.00"
                                value={saldoInicial}
                                onChange={(e) => setSaldoInicial(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Crear
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}