"use client";

import { useEffect, useState } from "react";
import { Building2, User } from "lucide-react";
import { Concesionaria, ConcesionariaPayload, ClienteFinalPayload } from "@/types/rastreadores.types";
import { rastreadoresService } from "@/services/rastreadores.service";

interface VentaConcesionariaFormProps {
    concesionariaId: string | null;
    concesionariaForm: ConcesionariaPayload;
    clienteFinal: ClienteFinalPayload;
    onConcesionariaIdChange: (id: string | null) => void;
    onConcesionariaFormChange: (data: Partial<ConcesionariaPayload>) => void;
    onClienteFinalChange: (data: Partial<ClienteFinalPayload>) => void;
}

const emptyConcesionariaForm: ConcesionariaPayload = {
    nombre: "",
    ruc: "",
    direccion: "",
    telefono: "",
    email: ""
};

const emptyClienteFinal: ClienteFinalPayload = {
    nombre: "",
    identificacion: "",
    telefono: ""
};

export function VentaConcesionariaForm({
    concesionariaId,
    concesionariaForm,
    clienteFinal,
    onConcesionariaIdChange,
    onConcesionariaFormChange,
    onClienteFinalChange
}: VentaConcesionariaFormProps) {
    const [concesionarias, setConcesionarias] = useState<Concesionaria[]>([]);
    const [modoNueva, setModoNueva] = useState(!concesionariaId);

    useEffect(() => {
        rastreadoresService.getConcesionarias().then(setConcesionarias);
    }, []);

    const seleccionada = concesionarias.find((c) => c.id === concesionariaId);

    return (
        <div className="space-y-6">
            {/* Bloque: Datos de la concesionaria */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
                <div className="flex items-center gap-2 text-amber-800">
                    <Building2 size={18} />
                    <span className="text-sm font-bold uppercase tracking-wide">Datos de la concesionaria</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="modo_concesionaria"
                            checked={!modoNueva}
                            onChange={() => {
                                setModoNueva(false);
                                onConcesionariaIdChange(concesionarias[0]?.id ?? null);
                                onConcesionariaFormChange(emptyConcesionariaForm);
                            }}
                            className="text-amber-600"
                        />
                        <span className="text-sm font-medium text-slate-700">Concesionaria existente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="modo_concesionaria"
                            checked={modoNueva}
                            onChange={() => {
                                setModoNueva(true);
                                onConcesionariaIdChange(null);
                            }}
                            className="text-amber-600"
                        />
                        <span className="text-sm font-medium text-slate-700">Nueva concesionaria</span>
                    </label>
                </div>

                {!modoNueva ? (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Seleccionar concesionaria</label>
                        <select
                            value={concesionariaId ?? ""}
                            onChange={(e) => {
                                const id = e.target.value || null;
                                onConcesionariaIdChange(id);
                                const c = id ? concesionarias.find((x) => x.id === id) : null;
                                if (c) onConcesionariaFormChange({ nombre: c.nombre, ruc: c.ruc, direccion: c.direccion ?? "", telefono: c.telefono ?? "", email: c.email ?? "" });
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        >
                            <option value="">-- Elija una --</option>
                            {concesionarias.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre} ({c.ruc})
                                </option>
                            ))}
                        </select>
                        {seleccionada && (
                            <p className="mt-1 text-xs text-slate-500">
                                {seleccionada.direccion && `${seleccionada.direccion} · `}
                                {seleccionada.telefono && `${seleccionada.telefono}`}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la concesionaria *</label>
                                <input
                                    type="text"
                                    value={concesionariaForm.nombre}
                                    onChange={(e) => onConcesionariaFormChange({ nombre: e.target.value })}
                                    placeholder="Ej. Autos del Sur"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">RUC *</label>
                                <input
                                    type="text"
                                    value={concesionariaForm.ruc}
                                    onChange={(e) => onConcesionariaFormChange({ ruc: e.target.value })}
                                    placeholder="0190000000001"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Dirección</label>
                            <input
                                type="text"
                                value={concesionariaForm.direccion ?? ""}
                                onChange={(e) => onConcesionariaFormChange({ direccion: e.target.value })}
                                placeholder="Ciudad, calle..."
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                            <input
                                type="text"
                                value={concesionariaForm.telefono ?? ""}
                                onChange={(e) => onConcesionariaFormChange({ telefono: e.target.value })}
                                placeholder="09..."
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                            <input
                                type="email"
                                value={concesionariaForm.email ?? ""}
                                onChange={(e) => onConcesionariaFormChange({ email: e.target.value })}
                                placeholder="contacto@concesionaria.com"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bloque: Cliente final (a quién venderá la concesionaria) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-700">
                    <User size={18} />
                    <span className="text-sm font-bold uppercase tracking-wide">Cliente final (a quién venderá la concesionaria)</span>
                </div>
                <p className="text-xs text-slate-500">
                    Opcional. Si ya conoce al comprador final del equipo, regístrelo aquí.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                        <input
                            type="text"
                            value={clienteFinal.nombre}
                            onChange={(e) => onClienteFinalChange({ nombre: e.target.value })}
                            placeholder="Cliente final"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Identificación (cédula/RUC)</label>
                        <input
                            type="text"
                            value={clienteFinal.identificacion}
                            onChange={(e) => onClienteFinalChange({ identificacion: e.target.value })}
                            placeholder="010..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                        <input
                            type="text"
                            value={clienteFinal.telefono}
                            onChange={(e) => onClienteFinalChange({ telefono: e.target.value })}
                            placeholder="09..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export { emptyConcesionariaForm, emptyClienteFinal };
