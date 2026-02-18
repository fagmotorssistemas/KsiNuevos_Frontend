"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2, Upload, Wallet, ArrowRight } from "lucide-react";
import type { GastoFijoConfig, Cuenta } from "@/types/taller";

interface RegistrarPagoGastoModalProps {
    isOpen: boolean;
    onClose: () => void;
    gasto: GastoFijoConfig | null;
    cuentas: Cuenta[];
    onPagar: (gastoId: string, monto: number, cuentaId: string, fecha: string, obs: string, file: File | null) => Promise<any>;
}

export function RegistrarPagoGastoModal({ isOpen, onClose, gasto, cuentas, onPagar }: RegistrarPagoGastoModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [monto, setMonto] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [observacion, setObservacion] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Obtener nombre del mes actual para la descripción automática
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    useEffect(() => {
        if (gasto) {
            // Precargar con el monto habitual, pero permitir edición
            setMonto(gasto.monto_habitual.toString());
            // Descripción sugerida automática
            setObservacion(`Pago de ${gasto.nombre} - ${mesActual}`);
        }
        if (cuentas.length > 0 && !cuentaId) setCuentaId(cuentas[0].id);
    }, [gasto, cuentas, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gasto) return;
        
        setIsLoading(true);
        await onPagar(gasto.id, parseFloat(monto), cuentaId, fecha, observacion, file);
        setIsLoading(false);
        onClose();
    };

    if (!isOpen || !gasto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Registrar Pago de Servicio
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* Resumen Visual */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Servicio</p>
                            <p className="font-bold text-slate-800 text-lg">{gasto.nombre}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-300" />
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase font-bold">Habitual</p>
                            <p className="font-bold text-slate-500 text-sm">${gasto.monto_habitual}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-emerald-600 uppercase block mb-1">Monto Real a Pagar ($)</label>
                            <input 
                                required
                                type="number" 
                                step="0.01"
                                className="w-full px-3 py-2 rounded-lg border-2 border-emerald-100 focus:border-emerald-500 focus:ring-0 outline-none font-black text-xl text-slate-800"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Puedes ajustar el valor si la factura varió.</p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha Pago</label>
                            <input 
                                required
                                type="date" 
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Debitar de Cuenta</label>
                        <select 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={cuentaId}
                            onChange={(e) => setCuentaId(e.target.value)}
                        >
                            {cuentas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre_cuenta} (Saldo: ${c.saldo_actual})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nota / Observación</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Foto Comprobante (Opcional)</label>
                        <label className="flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors group">
                            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                                <Upload className="h-4 w-4 text-slate-500" />
                            </div>
                            <span className="text-sm text-slate-600 truncate">{file ? file.name : "Click para subir foto del recibo"}</span>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl text-sm">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/20 text-sm transition-all">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Pago"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}