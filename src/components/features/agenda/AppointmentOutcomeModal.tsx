"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Phone, XCircle } from "lucide-react";

type NoShowFollowUp = "llamada" | "mensaje";

const QUICK_REASONS = [
    "Se le olvidó",
    "Imprevisto / no pudo llegar",
    "Ya no le interesa",
    "Quiere reprogramar",
    "No contestó",
];

interface AppointmentOutcomeModalProps {
    isOpen: boolean;
    clientName?: string | null;
    appointmentTitle?: string | null;
    submitting?: boolean;
    onClose: () => void;
    onConfirm: (input: {
        reason: string;
        followUp: NoShowFollowUp;
    }) => Promise<void> | void;
}

export function AppointmentOutcomeModal({
    isOpen,
    clientName,
    appointmentTitle,
    submitting = false,
    onClose,
    onConfirm,
}: AppointmentOutcomeModalProps) {
    const [reason, setReason] = useState("");
    const [followUp, setFollowUp] = useState<NoShowFollowUp | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setReason("");
        setFollowUp(null);
        setError(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const submit = async () => {
        if (submitting) return;
        const trimmed = reason.trim();
        if (!trimmed) {
            setError("Indica por qué no vino");
            return;
        }
        if (!followUp) {
            setError("Elige si se llamó o se dejó un mensaje");
            return;
        }
        setError(null);
        await onConfirm({ reason: trimmed, followUp });
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0 bg-slate-900/50"
                onClick={onClose}
                disabled={submitting}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="no-show-title"
                className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-red-100"
            >
                <div className="px-5 py-4 bg-red-50 border-b border-red-100 rounded-t-2xl">
                    <p id="no-show-title" className="text-sm font-bold text-red-900 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Cliente no vino
                    </p>
                    <p className="text-xs text-red-800/80 mt-1">
                        {clientName
                            ? `${clientName} no asistió${appointmentTitle ? ` a “${appointmentTitle}”` : ""}.`
                            : "Deja constancia del porqué y del seguimiento."}
                    </p>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            ¿Por qué no vino?
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_REASONS.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                        setReason(item);
                                        setError(null);
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                                        reason === item
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                setError(null);
                            }}
                            rows={3}
                            placeholder="Escribe el motivo…"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Seguimiento
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setFollowUp("llamada");
                                    setError(null);
                                }}
                                className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition ${
                                    followUp === "llamada"
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                            >
                                <Phone className="h-4 w-4" />
                                <span className="text-xs font-semibold leading-snug">
                                    Se llamó para saber el porqué
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFollowUp("mensaje");
                                    setError(null);
                                }}
                                className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition ${
                                    followUp === "mensaje"
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-xs font-semibold leading-snug">
                                    Se dejó un mensaje
                                </span>
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs font-medium text-red-600">{error}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Volver
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={submitting}
                            className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
