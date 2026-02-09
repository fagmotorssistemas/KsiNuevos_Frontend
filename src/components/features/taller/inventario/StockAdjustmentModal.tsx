"use client";

import { useState } from "react";
import { X, Save, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { InventarioItem } from "@/types/taller";

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: InventarioItem | null;
    onConfirm: (itemId: string, nuevoStock: number, motivo: string) => Promise<void>;
}

export function StockAdjustmentModal({ isOpen, onClose, item, onConfirm }: StockAdjustmentModalProps) {
    const [cantidad, setCantidad] = useState("");
    const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('entrada');
    const [motivo, setMotivo] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen || !item) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const delta = parseInt(cantidad);
        const nuevoStock = tipoMovimiento === 'entrada' 
            ? item.stock_actual + delta 
            : item.stock_actual - delta;

        await onConfirm(item.id, nuevoStock, motivo || `Ajuste manual: ${tipoMovimiento}`);
        
        setIsLoading(false);
        setCantidad("");
        setMotivo("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Ajuste de Stock</h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-center mb-4">
                        <p className="text-sm text-slate-500">Producto</p>
                        <p className="font-bold text-lg text-slate-900">{item.nombre}</p>
                        <p className="text-xs text-slate-400 font-mono">Stock Actual: {item.stock_actual} {item.unidad_medida}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setTipoMovimiento('entrada')}
                            className={`flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${tipoMovimiento === 'entrada' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <ArrowUpCircle className="h-4 w-4" /> Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipoMovimiento('salida')}
                            className={`flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${tipoMovimiento === 'salida' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <ArrowDownCircle className="h-4 w-4" /> Salida
                        </button>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cantidad a {tipoMovimiento === 'entrada' ? 'Agregar' : 'Restar'}</label>
                        <input 
                            required type="number" min="1"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={cantidad} onChange={e => setCantidad(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Motivo / Observación</label>
                        <input 
                            type="text" placeholder="Ej: Compra factura #123"
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                            value={motivo} onChange={e => setMotivo(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit" disabled={isLoading || !cantidad}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Confirmar Ajuste
                    </button>
                </form>
            </div>
        </div>
    );
}