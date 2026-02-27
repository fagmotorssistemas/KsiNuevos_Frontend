"use client";

import { useRef } from "react";
import { Banknote, ArrowRightLeft, Building2, FileCheck, Upload, Trash2, FileImage } from "lucide-react";
import { MetodoPagoRastreadorEnum } from "@/types/rastreadores.types";

const METODOS: { value: MetodoPagoRastreadorEnum; label: string; icon: typeof Banknote; descComprobante: string }[] = [
    { value: MetodoPagoRastreadorEnum.EFECTIVO, label: "Efectivo", icon: Banknote, descComprobante: "Comprobante del depósito (efectivo depositado)" },
    { value: MetodoPagoRastreadorEnum.TRANSFERENCIA, label: "Transferencia", icon: ArrowRightLeft, descComprobante: "Captura o foto de la transferencia" },
    { value: MetodoPagoRastreadorEnum.DEPOSITO, label: "Depósito", icon: Building2, descComprobante: "Comprobante de depósito" },
    { value: MetodoPagoRastreadorEnum.CHEQUE, label: "Cheque", icon: FileCheck, descComprobante: "Foto del cheque" }
];

interface MetodoPagoYComprobanteProps {
    metodoPago: MetodoPagoRastreadorEnum;
    comprobanteFile: File | null;
    onMetodoChange: (metodo: MetodoPagoRastreadorEnum) => void;
    onComprobanteSelect: (file: File | null) => void;
}

export function MetodoPagoYComprobante({
    metodoPago,
    comprobanteFile,
    onMetodoChange,
    onComprobanteSelect
}: MetodoPagoYComprobanteProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const current = METODOS.find((m) => m.value === metodoPago) ?? METODOS[0];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        onComprobanteSelect(file ?? null);
        e.target.value = "";
    };

    return (
        <div className="space-y-4 pt-4 border-t border-slate-200">
            <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">¿Cómo se realizó el pago?</h4>
                <p className="text-xs text-slate-500">Seleccione el medio de pago y adjunte el comprobante correspondiente.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {METODOS.map((m) => {
                    const Icon = m.icon;
                    const selected = metodoPago === m.value;
                    return (
                        <button
                            key={m.value}
                            type="button"
                            onClick={() => onMetodoChange(m.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                                selected
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-slate-100"
                            }`}
                        >
                            <Icon size={20} className={selected ? "text-emerald-600" : "text-slate-400"} />
                            <span className="text-xs font-semibold">{m.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-medium text-slate-600 mb-2">
                    {current.descComprobante}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {!comprobanteFile ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        >
                            <Upload size={16} />
                            Subir comprobante
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-emerald-200 text-sm text-slate-800 min-w-0">
                                <FileImage size={16} className="text-emerald-600 shrink-0" />
                                <span className="truncate">{comprobanteFile.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onComprobanteSelect(null)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Quitar comprobante"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-medium text-emerald-600 hover:underline"
                            >
                                Cambiar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
