"use client";

import { useState } from "react";
import { Loader2, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { rastreadoresService } from "@/services/rastreadores.service";

interface StockItem {
    id: string;
    imei: string;
    modelo?: { marca?: string | null };
    proveedor?: { nombre: string };
    costo_compra: number;
    estado: 'STOCK' | 'VENDIDO' | 'RMA' | 'BAJA' | 'INSTALADO';
}

interface BuscarStockProps {
    imei: string;
    onImeiChange: (value: string) => void;
    onStockFound: (item: StockItem | null) => void;
    onFormUpdate: (updates: { modelo: string; proveedor: string; costo: number; imei: string }) => void;
    stockItem: StockItem | null;
}

export function BuscarStock({ imei, onImeiChange, onStockFound, onFormUpdate, stockItem }: BuscarStockProps) {
    const [validatingStock, setValidatingStock] = useState(false);
    const [suggestions, setSuggestions] = useState<StockItem[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const applyStockItem = (item: StockItem) => {
        onStockFound(item);
        onFormUpdate({
            modelo: item.modelo?.marca || 'Desconocido',
            proveedor: item.proveedor?.nombre || 'Bodega',
            costo: item.costo_compra,
            imei: item.imei
        });
    };

    const handleCheckStock = async () => {
        if (!imei || imei.length < 5) return toast.error("Ingrese un IMEI válido para buscar");

        setValidatingStock(true);
        try {
            const res = await rastreadoresService.validarStock(imei.trim());

            if (res.found && res.status === 'STOCK' && res.data) {
                const item = res.data as StockItem;
                applyStockItem(item);
                toast.success("Dispositivo encontrado en Stock");
            } else if (res.found && res.status !== 'STOCK') {
                toast.warning(`Este IMEI ya figura como ${res.status}`);
                onStockFound(null);
            } else {
                toast.error("IMEI no encontrado en Bodega. ¿Es un equipo externo?");
                onStockFound(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al validar stock");
        } finally {
            setValidatingStock(false);
        }
    };

    const handleImeiChange = async (value: string) => {
        onImeiChange(value);
        if (stockItem) onStockFound(null);

        const query = value.trim();
        if (query.length < 5) {
            setSuggestions([]);
            return;
        }

        setLoadingSuggestions(true);
        try {
            const resultados = await rastreadoresService.buscarInventarioPorImeiDesdeInventario(query);
            setSuggestions(resultados || []);
        } catch (error) {
            console.error(error);
            setSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    return (
        <div className={`p-5 rounded-xl border ${stockItem ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {stockItem ? 'Dispositivo seleccionado (de bodega)' : 'Buscar dispositivo en bodega'}
                </label>
                {stockItem && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 size={12} /> Stock verificado</span>}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={imei}
                    onChange={e => {
                        void handleImeiChange(e.target.value);
                    }}
                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-300 tracking-widest placeholder:tracking-normal shadow-sm"
                    placeholder="Escanear IMEI aquí..."
                />
                <button
                    onClick={handleCheckStock}
                    disabled={validatingStock}
                    className="bg-slate-900 text-white px-4 rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60"
                >
                    {validatingStock ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
            </div>
            {imei.length >= 5 && (
                <div className="mt-2 space-y-1">
                    {loadingSuggestions && (
                        <p className="text-[10px] text-slate-400">Buscando en stock...</p>
                    )}
                    {!loadingSuggestions && suggestions.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-h-40 overflow-y-auto">
                            {suggestions.map(item => {
                                const isStock = item.estado === 'STOCK';
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={!isStock}
                                        onClick={() => {
                                            if (!isStock) return;
                                            applyStockItem(item);
                                            setSuggestions([]);
                                            toast.success("Dispositivo seleccionado desde bodega");
                                        }}
                                        className={`w-full px-4 py-2.5 text-left border-b border-slate-100 last:border-0 flex items-center justify-between gap-3 transition-colors
                                            ${isStock ? 'hover:bg-slate-50 cursor-pointer' : 'bg-slate-50/50 cursor-not-allowed'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`font-mono font-bold tracking-widest text-sm ${isStock ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {item.imei}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isStock ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {item.modelo?.marca || 'Sin modelo'}
                                            </span>
                                            <span className={`text-[11px] ${isStock ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {item.proveedor?.nombre || 'Bodega'}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md border tracking-wide ${
                                            isStock 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                                : 'bg-rose-50 text-rose-600 border-rose-200'
                                        }`}>
                                            {item.estado}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {!stockItem && imei.length > 5 && (
                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Sugerencia: Pulse la lupa para validar stock.
                </p>
            )}
        </div>
    );
}
