"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import type { LeadCallRequest } from "@/types/leads.types";
import { CALL_REQUEST_MAX_POSTPONES } from "@/types/leads.types";

const PRESETS_MINUTES = [
    { minutes: 15, label: "15 min" },
    { minutes: 30, label: "30 min" },
    { minutes: 60, label: "1 hora" },
];

function ecuadorParts(date: Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Guayaquil",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "";
    return {
        date: `${get("year")}-${get("month")}-${get("day")}`,
        time: `${get("hour")}:${get("minute")}`,
    };
}

function toEcuadorIso(dateYmd: string, timeHm: string) {
    return `${dateYmd}T${timeHm}:00-05:00`;
}

function formatWhen(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("es-EC", {
        timeZone: "America/Guayaquil",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

interface LeadCallRequestModalProps {
    lead: LeadCallRequest;
    remaining: number;
    submitting?: boolean;
    onManaged: () => Promise<void>;
    onPostpone: (reason: string, untilIso: string) => Promise<void>;
}

export function LeadCallRequestModal({
    lead,
    remaining,
    submitting = false,
    onManaged,
    onPostpone,
}: LeadCallRequestModalProps) {
    const used = lead.llamada_posponer_veces ?? 0;
    const canPostpone = used < CALL_REQUEST_MAX_POSTPONES;
    const left = CALL_REQUEST_MAX_POSTPONES - used;

    const [reason, setReason] = useState("");
    const [dateYmd, setDateYmd] = useState("");
    const [timeHm, setTimeHm] = useState("");
    const [error, setError] = useState<string | null>(null);

    const minParts = useMemo(() => ecuadorParts(new Date(Date.now() + 60_000)), [lead.id]);

    useEffect(() => {
        const later = ecuadorParts(new Date(Date.now() + 30 * 60_000));
        setReason("");
        setDateYmd(later.date);
        setTimeHm(later.time);
        setError(null);
    }, [lead.id]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        window.addEventListener("keydown", onKeyDown, true);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const applyPreset = (minutes: number) => {
        const later = ecuadorParts(new Date(Date.now() + minutes * 60_000));
        setDateYmd(later.date);
        setTimeHm(later.time);
        setError(null);
    };

    const handleManaged = async () => {
        if (submitting) return;
        try {
            await onManaged();
            toast.success("Llamada marcada como gestionada");
        } catch (err) {
            console.error(err);
            toast.error("No se pudo guardar la gestión");
        }
    };

    const handlePostpone = async () => {
        if (submitting) return;
        if (!canPostpone) {
            setError("Ya aplazaste 2 veces. Debes gestionar la llamada.");
            return;
        }
        const trimmed = reason.trim();
        if (!trimmed) {
            setError("Escribe por qué no se va a llamar ahora");
            return;
        }
        if (!dateYmd || !timeHm) {
            setError("Indica cuándo vas a llamar");
            return;
        }
        const untilIso = toEcuadorIso(dateYmd, timeHm);
        if (new Date(untilIso).getTime() <= Date.now()) {
            setError("La hora debe ser posterior a ahora");
            return;
        }
        setError(null);
        try {
            await onPostpone(trimmed, untilIso);
            toast.success("Quedó programado. El aviso volverá a esa hora.");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "No se pudo programar");
        }
    };

    const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\s+/g, "")}` : null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="call-request-title"
                className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl"
            >
                <div className="bg-red-600 px-5 py-4 text-white">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-100">
                        Aviso obligatorio
                    </p>
                    <h2 id="call-request-title" className="mt-1 text-xl font-black tracking-tight">
                        EL CLIENTE SOLICITA LLAMADA
                    </h2>
                    {remaining > 1 && (
                        <p className="mt-1 text-xs text-red-100">
                            {remaining} solicitudes pendientes
                        </p>
                    )}
                </div>

                <div className="space-y-4 px-5 py-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Cliente
                        </p>
                        <p className="mt-0.5 text-lg font-bold text-slate-900">{lead.name}</p>
                        {lead.phone && (
                            <p className="mt-1 text-sm font-medium text-slate-600">{lead.phone}</p>
                        )}
                    </div>

                    {lead.llamada_posponer_hasta && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <p className="font-semibold">El horario programado ya pasó.</p>
                            <p className="mt-1">
                                Motivo anterior: {lead.llamada_posponer_razon || "—"} ·{" "}
                                {formatWhen(lead.llamada_posponer_hasta)}
                            </p>
                        </div>
                    )}

                    <p className="text-sm text-slate-600">
                        Esta ventana no se puede cerrar hasta gestionar la llamada.
                    </p>

                    {phoneHref && (
                        <a
                            href={phoneHref}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
                        >
                            <Phone className="h-4 w-4" />
                            Llamar ahora
                        </a>
                    )}

                    <button
                        type="button"
                        onClick={() => void handleManaged()}
                        disabled={submitting}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <PhoneCall className="h-4 w-4" />
                        )}
                        Ya gestioné la llamada
                    </button>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800">
                                No puedo llamar ahora
                            </p>
                            <span className="text-[11px] font-semibold text-slate-500">
                                {used}/{CALL_REQUEST_MAX_POSTPONES} aplazamientos
                            </span>
                        </div>

                        {canPostpone ? (
                            <>
                                <p className="mb-2 text-xs text-slate-500">
                                    Escribe por qué no se va a llamar ahora y cuándo lo vas a hacer.
                                    Puedes cambiar esto {left === 1 ? "1 vez más" : `${left} veces`}.
                                </p>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    placeholder="Motivo (obligatorio)"
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {PRESETS_MINUTES.map((preset) => (
                                        <button
                                            key={preset.minutes}
                                            type="button"
                                            onClick={() => applyPreset(preset.minutes)}
                                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            En {preset.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Día
                                        <input
                                            type="date"
                                            value={dateYmd}
                                            min={minParts.date}
                                            onChange={(e) => setDateYmd(e.target.value)}
                                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            Hora
                                        </span>
                                        <input
                                            type="time"
                                            value={timeHm}
                                            onChange={(e) => setTimeHm(e.target.value)}
                                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handlePostpone()}
                                    disabled={submitting}
                                    className="mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                                >
                                    Programar llamada
                                </button>
                            </>
                        ) : (
                            <p className="text-sm font-medium text-red-700">
                                Ya aplazaste 2 veces. Debes gestionar la llamada ahora.
                            </p>
                        )}

                        {error && (
                            <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
