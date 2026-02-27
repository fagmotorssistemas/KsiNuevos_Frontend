"use client";

import { ContratoGPS } from "@/types/rastreadores.types";

interface DatosDispositivoProps {
    isExternal: boolean;
    seleccionado: ContratoGPS | null;
    stockItem: any;
    modelo: string;
    costo: number;
    precioVenta: number;
    onModeloChange: (value: string) => void;
    onCostoChange: (value: number) => void;
    onPrecioVentaChange: (value: number) => void;
}

export function DatosDispositivo({
    isExternal,
    seleccionado,
    stockItem,
    modelo,
    costo,
    precioVenta,
    onModeloChange,
    onCostoChange,
    onPrecioVentaChange
}: DatosDispositivoProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Modelo GPS</label>
                <input
                    type="text"
                    value={modelo}
                    onChange={e => onModeloChange(e.target.value)}
                    disabled={!!stockItem}
                    className={`w-full p-3 rounded-xl text-sm font-bold outline-none border uppercase ${stockItem ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-900 border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-300'}`}
                    placeholder="Ej: FMC-920"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Costo Compra ($)</label>
                    <input
                        type="number"
                        value={costo}
                        onChange={e => onCostoChange(parseFloat(e.target.value) || 0)}
                        disabled={!!stockItem}
                        className={`w-full p-3 rounded-xl text-sm font-bold outline-none border text-right ${stockItem ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-900 border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-300'}`}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Precio Venta ($)</label>
                    {isExternal ? (
                        <input
                            type="number"
                            value={precioVenta}
                            onChange={e => onPrecioVentaChange(parseFloat(e.target.value) || 0)}
                            className="w-full p-3 rounded-xl text-sm font-black outline-none border bg-rose-50 text-slate-900 border-rose-100 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 text-right"
                        />
                    ) : (
                        <div className="w-full p-3 rounded-xl text-sm font-black bg-slate-100 text-slate-500 border border-slate-200 text-right">
                            ${seleccionado?.totalRastreador}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
