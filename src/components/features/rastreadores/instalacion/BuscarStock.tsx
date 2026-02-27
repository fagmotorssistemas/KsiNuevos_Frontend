"use client";

import { useState } from "react";
import { Loader2, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { rastreadoresService } from "@/services/rastreadores.service";

interface StockItem {
    id: string;
    imei: string;
    modelo?: { nombre: string };
    proveedor?: { nombre: string };
    costo_compra: number;
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

    const handleCheckStock = async () => {
        if (!imei || imei.length < 5) return toast.error("Ingrese un IMEI válido para buscar");

        setValidatingStock(true);
        try {
            const res = await rastreadoresService.validarStock(imei.trim());

            if (res.found && res.status === 'STOCK' && res.data) {
                const item = res.data;
                onStockFound(item);

                onFormUpdate({
                    modelo: item.modelo?.nombre || 'Desconocido',
                    proveedor: item.proveedor?.nombre || 'Bodega',
                    costo: item.costo_compra,
                    imei: item.imei
                });
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
                        onImeiChange(e.target.value);
                        if (stockItem) onStockFound(null);
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
            {!stockItem && imei.length > 5 && (
                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Sugerencia: Pulse la lupa para validar stock.
                </p>
            )}
        </div>
    );
}
