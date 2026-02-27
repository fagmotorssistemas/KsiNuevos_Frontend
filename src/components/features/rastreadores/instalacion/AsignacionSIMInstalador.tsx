"use client";

import { Smartphone, CheckCircle2 } from "lucide-react";
import { InventarioSIM } from "@/types/rastreadores.types";

interface InstaladorItem {
    id: string;
    nombre: string;
    activo: boolean;
    valor_por_instalacion: number;
}

interface AsignacionSIMInstaladorProps {
    sims: InventarioSIM[];
    instaladores: InstaladorItem[];
    simId: string;
    instaladorId: string;
    costoInstalacion: number;
    onSimChange: (value: string) => void;
    onInstaladorChange: (value: string, costo: number) => void;
    onCostoInstalacionChange: (value: number) => void;
}

export function AsignacionSIMInstalador({
    sims,
    instaladores,
    simId,
    instaladorId,
    costoInstalacion,
    onSimChange,
    onInstaladorChange,
    onCostoInstalacionChange
}: AsignacionSIMInstaladorProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            {/* Selección de SIM */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Smartphone size={12} /> Tarjeta SIM
                </label>
                <select
                    value={simId}
                    onChange={e => onSimChange(e.target.value)}
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border bg-slate-50 text-slate-900 border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-300"
                >
                    <option value="">Sin SIM asignada</option>
                    {sims.filter(s => s.estado === 'STOCK').map(sim => (
                        <option key={sim.id} value={sim.id}>
                            {sim.numero || sim.iccid} - {sim.operadora} (${sim.costo_mensual}/mes)
                        </option>
                    ))}
                </select>
                {simId && (
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={10} /> SIM seleccionada
                    </p>
                )}
            </div>

            {/* Selección de Instalador y Costo */}
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Instalador
                    </label>
                    <select
                        value={instaladorId}
                        onChange={e => {
                            const selectedInstalador = instaladores.find(inst => inst.id === e.target.value);
                            onInstaladorChange(e.target.value, selectedInstalador?.valor_por_instalacion || 0);
                        }}
                        className="w-full p-3 rounded-xl text-sm font-bold outline-none border bg-slate-50 text-slate-900 border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-300"
                    >
                        <option value="">Seleccionar...</option>
                        {instaladores.filter(inst => inst.activo).map(instalador => (
                            <option key={instalador.id} value={instalador.id}>
                                {instalador.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Costo Inst.
                    </label>
                    <input
                        type="number"
                        value={costoInstalacion}
                        onChange={e => onCostoInstalacionChange(parseFloat(e.target.value) || 0)}
                        className="w-full p-3 rounded-xl text-sm font-bold outline-none border bg-slate-50 text-slate-900 border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 text-right"
                        placeholder="$0"
                    />
                </div>
            </div>
        </div>
    );
}
