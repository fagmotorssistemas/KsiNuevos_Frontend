"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calendar } from "lucide-react";
import { PagoRastreadorInfo, TipoPagoEnum, MetodoPagoRastreadorEnum } from "@/types/rastreadores.types";
import { MetodoPagoYComprobante } from "./MetodoPagoYComprobante";

interface PagoRastreadorExternoModuleProps {
    totalRastreador: number;
    onPagoChange: (info: PagoRastreadorInfo & { tipo_pago: TipoPagoEnum }) => void;
    metodoPago: MetodoPagoRastreadorEnum;
    comprobanteFile: File | null;
    onMetodoPagoChange: (metodo: MetodoPagoRastreadorEnum) => void;
    onComprobantePagoChange: (file: File | null) => void;
}

const MESES_OPCIONES = Array.from({ length: 12 }, (_, i) => i + 1);

export function PagoRastreadorExternoModule({
    totalRastreador,
    onPagoChange,
    metodoPago,
    comprobanteFile,
    onMetodoPagoChange,
    onComprobantePagoChange
}: PagoRastreadorExternoModuleProps) {
    const [tipoPago, setTipoPago] = useState<TipoPagoEnum>(TipoPagoEnum.CONTADO);
    const [meses, setMeses] = useState<number>(12);
    const [entrada, setEntrada] = useState<number>(0);

    useEffect(() => {
        if (totalRastreador <= 0) {
            onPagoChange({
                totalFinal: totalRastreador,
                monto_rastreador: totalRastreador,
                porcentaje_rastreador: 1,
                cuota_mensual: 0,
                valor_rastreador_mensual: 0,
                numero_cuotas_credito: undefined,
                tipo_pago: TipoPagoEnum.CONTADO,
                abono_inicial: 0,
                metodo_pago_medio: metodoPago
            });
            return;
        }

        if (tipoPago === TipoPagoEnum.CONTADO) {
            onPagoChange({
                totalFinal: totalRastreador,
                monto_rastreador: totalRastreador,
                porcentaje_rastreador: 1,
                cuota_mensual: 0,
                valor_rastreador_mensual: 0,
                numero_cuotas_credito: undefined,
                tipo_pago: TipoPagoEnum.CONTADO,
                abono_inicial: 0,
                metodo_pago_medio: metodoPago
            });
            return;
        }

        const abonoInicial = Math.min(Math.max(0, entrada), totalRastreador);
        const aFinanciar = totalRastreador - abonoInicial;
        const cuotaMensual = meses > 0 ? aFinanciar / meses : 0;

        onPagoChange({
            totalFinal: totalRastreador,
            monto_rastreador: totalRastreador,
            porcentaje_rastreador: 1,
            cuota_mensual: cuotaMensual,
            valor_rastreador_mensual: cuotaMensual,
            numero_cuotas_credito: meses,
            tipo_pago: TipoPagoEnum.CREDITO,
            abono_inicial: abonoInicial > 0 ? abonoInicial : undefined,
            metodo_pago_medio: metodoPago
        });
    }, [totalRastreador, tipoPago, meses, entrada, metodoPago, onPagoChange]);

    const aFinanciar = totalRastreador - Math.min(Math.max(0, entrada), totalRastreador);
    const cuotaMensual = tipoPago === TipoPagoEnum.CREDITO && meses > 0 ? aFinanciar / meses : 0;

    return (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">💳 Forma de Pago del Rastreador</h3>
                <p className="text-sm text-slate-500">Elija si el cliente paga al contado o a crédito (máximo 12 meses).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {[TipoPagoEnum.CONTADO, TipoPagoEnum.CREDITO].map((tipo) => (
                    <button
                        key={tipo}
                        type="button"
                        onClick={() => setTipoPago(tipo)}
                        className={`p-4 rounded-xl font-bold transition-all ${
                            tipoPago === tipo
                                ? "bg-slate-900 text-white shadow-lg"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            {tipo === TipoPagoEnum.CONTADO ? (
                                <>
                                    <DollarSign size={18} />
                                    <span>CONTADO</span>
                                </>
                            ) : (
                                <>
                                    <Calendar size={18} />
                                    <span>CRÉDITO</span>
                                </>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {tipoPago === TipoPagoEnum.CONTADO && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3">
                    <div className="flex items-start gap-3">
                        <DollarSign className="text-green-600 mt-1 shrink-0" size={20} />
                        <div className="flex-1">
                            <p className="text-sm text-slate-600 font-semibold">Pago inmediato</p>
                            <p className="text-2xl font-black text-green-600">
                                ${totalRastreador.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                El cliente paga el valor total del rastreador en una sola cuota.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {tipoPago === TipoPagoEnum.CREDITO && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
                    <p className="text-sm font-semibold text-slate-700">Opciones de crédito (máximo 1 año)</p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Plazo (meses)</label>
                            <select
                                value={meses}
                                onChange={(e) => setMeses(Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                {MESES_OPCIONES.map((m) => (
                                    <option key={m} value={m}>
                                        {m} {m === 1 ? "mes" : "meses"}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Entrada (opcional)</label>
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={entrada > 0 ? entrada : ""}
                                onChange={(e) => setEntrada(e.target.value === "" ? 0 : Number(e.target.value))}
                                placeholder="0.00"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total rastreador</span>
                            <span className="font-semibold">${totalRastreador.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
                        </div>
                        {entrada > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Menos entrada</span>
                                <span className="font-semibold">- ${entrada.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                            <span className="text-slate-600">A financiar</span>
                            <span className="font-semibold">${aFinanciar.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-blue-600">
                            <span>Cuota mensual</span>
                            <span>${cuotaMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Total rastreador</p>
                    <p className="font-black text-slate-900 text-sm">
                        ${totalRastreador.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">{tipoPago === TipoPagoEnum.CREDITO ? "Cuota mensual" : "Pago"}</p>
                    <p className="font-bold text-slate-700 text-sm">
                        {tipoPago === TipoPagoEnum.CONTADO
                            ? `$${totalRastreador.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`
                            : `$${cuotaMensual.toLocaleString("es-EC", { minimumFractionDigits: 2 })} x ${meses} meses`}
                    </p>
                </div>
            </div>

            <MetodoPagoYComprobante
                metodoPago={metodoPago}
                comprobanteFile={comprobanteFile}
                onMetodoChange={onMetodoPagoChange}
                onComprobanteSelect={onComprobantePagoChange}
            />
        </div>
    );
}
