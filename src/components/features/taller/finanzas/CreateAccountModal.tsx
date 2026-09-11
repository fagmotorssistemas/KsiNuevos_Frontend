"use client";

import { useState } from "react";
import { X, Save, Loader2, CreditCard, Wallet } from "lucide-react";
import type { TallerTipoCuenta } from "@/types/taller";

interface CreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        nombre_cuenta: string;
        numero_cuenta: string;
        saldo_actual: number;
        es_caja_chica: boolean;
        tipo_cuenta: TallerTipoCuenta | null;
        nombre_titular: string | null;
    }) => Promise<any>;
}

export function CreateAccountModal({ isOpen, onClose, onSave }: CreateAccountModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    const [entidad, setEntidad] = useState('');
    const [tipoCuenta, setTipoCuenta] = useState<TallerTipoCuenta | ''>('');
    const [numero, setNumero] = useState('');
    const [titular, setTitular] = useState('');
    const [esCajaChica, setEsCajaChica] = useState(false);

    const resetForm = () => {
        setEntidad('');
        setTipoCuenta('');
        setNumero('');
        setTitular('');
        setEsCajaChica(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!esCajaChica && !tipoCuenta) return;
        setIsLoading(true);
        
        await onSave({
            nombre_cuenta: entidad,
            numero_cuenta: esCajaChica ? '' : numero,
            saldo_actual: 0,
            es_caja_chica: esCajaChica,
            tipo_cuenta: esCajaChica || !tipoCuenta ? null : tipoCuenta,
            nombre_titular: esCajaChica ? null : titular,
        });

        setIsLoading(false);
        onClose();
        resetForm();
    };

    if (!isOpen) return null;

    const inputClass =
        "w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {esCajaChica ? <Wallet className="h-5 w-5 text-emerald-600" /> : <CreditCard className="h-5 w-5 text-blue-600" />}
                        Nueva Cuenta
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    
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
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                            {esCajaChica ? 'Nombre' : 'Entidad financiera'}
                        </label>
                        <input 
                            required
                            type="text" 
                            className={inputClass}
                            placeholder={esCajaChica ? 'Ej: Caja chica taller' : 'Ej: Banco Pichincha'}
                            value={entidad}
                            onChange={(e) => setEntidad(e.target.value)}
                        />
                    </div>

                    {!esCajaChica && (
                        <>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo de cuenta</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTipoCuenta('ahorro')}
                                        className={`py-2.5 rounded-lg border text-sm font-bold transition-colors ${
                                            tipoCuenta === 'ahorro'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Ahorro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTipoCuenta('corriente')}
                                        className={`py-2.5 rounded-lg border text-sm font-bold transition-colors ${
                                            tipoCuenta === 'corriente'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Corriente
                                    </button>
                                </div>
                                {!tipoCuenta && (
                                    <p className="text-xs text-slate-400 mt-1">Selecciona ahorro o corriente.</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Número de cuenta</label>
                                <input 
                                    required
                                    type="text" 
                                    className={`${inputClass} font-mono text-sm`}
                                    placeholder="Ej: 2200123456"
                                    value={numero}
                                    onChange={(e) => setNumero(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre del titular</label>
                                <input 
                                    required
                                    type="text" 
                                    className={inputClass}
                                    placeholder="Nombre completo del titular"
                                    value={titular}
                                    onChange={(e) => setTitular(e.target.value)}
                                />
                            </div>
                        </>
                    )}

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
                            disabled={isLoading || (!esCajaChica && !tipoCuenta)}
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
