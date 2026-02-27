"use client";

import { User, Car, Building2 } from "lucide-react";
import { ContratoGPS, ConcesionariaPayload, ClienteFinalPayload } from "@/types/rastreadores.types";
import { VentaConcesionariaForm, emptyConcesionariaForm, emptyClienteFinal } from "./VentaConcesionariaForm";

interface NuevoClienteState {
    nombre: string;
    identificacion: string;
    telefono: string;
    email: string;
    placa: string;
    marca: string;
    modelo: string;
    anio: string;
    color: string;
}

export type TipoCompradorExterno = "PERSONA" | "CONCESIONARIA";

interface ClienteInfoProps {
    isExternal: boolean;
    seleccionado: ContratoGPS | null;
    newClient: NuevoClienteState;
    onClientChange: (field: keyof NuevoClienteState, value: string) => void;
    // Venta a concesionaria (solo cuando isExternal)
    tipoComprador?: TipoCompradorExterno;
    onTipoCompradorChange?: (tipo: TipoCompradorExterno) => void;
    concesionariaId?: string | null;
    concesionariaForm?: ConcesionariaPayload;
    clienteFinal?: ClienteFinalPayload;
    onConcesionariaIdChange?: (id: string | null) => void;
    onConcesionariaFormChange?: (data: Partial<ConcesionariaPayload>) => void;
    onClienteFinalChange?: (data: Partial<ClienteFinalPayload>) => void;
}

export function ClienteInfo({
    isExternal,
    seleccionado,
    newClient,
    onClientChange,
    tipoComprador = "PERSONA",
    onTipoCompradorChange,
    concesionariaId = null,
    concesionariaForm = emptyConcesionariaForm,
    clienteFinal = emptyClienteFinal,
    onConcesionariaIdChange,
    onConcesionariaFormChange,
    onClienteFinalChange
}: ClienteInfoProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 border-l-4 border-l-[#E11D48]">
                <User size={16} className="text-slate-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Información del Cliente</h3>
            </div>

            <div className="p-6">
                {!isExternal ? (
                    // MODO LECTURA (desde lista de contratos)
                    seleccionado?.origen === "EXTERNO" && seleccionado.esConcesionaria ? (
                        // Venta externa a CONCESIONARIA: mostrar concesionaria + cliente final
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-rose-50 border-2 border-rose-100 px-4 py-3 rounded-xl text-center shadow-sm">
                                        <span className="block text-[9px] font-black text-rose-500 uppercase leading-none mb-1">
                                            VENTA A CONCESIONARIA
                                        </span>
                                        <span className="block text-[11px] font-black text-rose-700 uppercase">
                                            {seleccionado.nombreConcesionaria || seleccionado.cliente}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Building2 size={13} /> Concesionaria
                                        </p>
                                        <h4 className="text-base font-black text-slate-900 uppercase">
                                            {seleccionado.nombreConcesionaria || seleccionado.cliente}
                                        </h4>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase flex gap-2">
                                            <span>RUC: {seleccionado.ruc}</span>
                                            {seleccionado.notaVenta && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-mono">NV: {seleccionado.notaVenta}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-500">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        Resumen vehículo
                                    </p>
                                    <p className="font-bold text-slate-800">
                                        {seleccionado.placa || "N/A"} · {seleccionado.marca} {seleccionado.modelo}
                                    </p>
                                </div>
                            </div>

                            {/* Bloque: Cliente final a quien la concesionaria vende */}
                            {(seleccionado.clienteFinalNombre || seleccionado.clienteFinalIdentificacion) && (
                                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <User size={12} className="text-slate-500" />
                                        Cliente final de la concesionaria
                                    </p>
                                    <p className="text-sm font-bold text-slate-900">
                                        {seleccionado.clienteFinalNombre}
                                    </p>
                                    <p className="text-[11px] text-slate-600">
                                        {seleccionado.clienteFinalIdentificacion && (
                                            <span className="mr-3">ID: {seleccionado.clienteFinalIdentificacion}</span>
                                        )}
                                        {seleccionado.clienteFinalTelefono && (
                                            <span>Tel: {seleccionado.clienteFinalTelefono}</span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Cliente auto (Oracle o externo persona)
                        <div className="flex items-center gap-6">
                            <div className="bg-slate-100 border-2 border-slate-200 px-4 py-3 rounded-xl text-center shadow-sm">
                                <span className="block text-[9px] font-black text-slate-400 uppercase leading-none mb-1">PLACA</span>
                                <span className="block text-2xl font-black text-slate-900 font-mono leading-none">{seleccionado?.placa}</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 uppercase">{seleccionado?.cliente}</h4>
                                <p className="text-xs font-bold text-slate-500 uppercase flex gap-2">
                                    <span>RUC: {seleccionado?.ruc}</span>
                                    <span>•</span>
                                    <span>{seleccionado?.marca} {seleccionado?.modelo}</span>
                                </p>
                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase rounded-md border border-rose-100">
                                    <span className="opacity-70">Nota Venta:</span>
                                    <span className="font-mono">{seleccionado?.notaVenta}</span>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <>
                        {/* ¿A quién le vende? Persona natural | Concesionaria */}
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">¿A quién le vende?</p>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => onTipoCompradorChange?.("PERSONA")}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                                        tipoComprador === "PERSONA"
                                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <User size={16} />
                                        Persona natural
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onTipoCompradorChange?.("CONCESIONARIA")}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                                        tipoComprador === "CONCESIONARIA"
                                            ? "bg-[#E11D48] text-white border-[#E11D48] shadow-md shadow-rose-100"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-rose-200 hover:bg-rose-50/50"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Building2 size={16} />
                                        Concesionaria
                                    </span>
                                </button>
                            </div>
                        </div>

                        {tipoComprador === "CONCESIONARIA" ? (
                            <>
                                <VentaConcesionariaForm
                                    concesionariaId={concesionariaId ?? null}
                                    concesionariaForm={concesionariaForm}
                                    clienteFinal={clienteFinal}
                                    onConcesionariaIdChange={onConcesionariaIdChange ?? (() => {})}
                                    onConcesionariaFormChange={onConcesionariaFormChange ?? (() => {})}
                                    onClienteFinalChange={onClienteFinalChange ?? (() => {})}
                                />
                                {/* Datos del vehículo (igual que en persona natural) */}
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Car size={12} /> Datos del vehículo</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Placa</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-black text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none uppercase tracking-wider transition-colors"
                                                value={newClient.placa}
                                                onChange={e => onClientChange("placa", e.target.value.toUpperCase())}
                                                placeholder="AAA-0000"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Marca</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none uppercase transition-colors"
                                                value={newClient.marca}
                                                onChange={e => onClientChange("marca", e.target.value.toUpperCase())}
                                                placeholder="Ej. Toyota"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Modelo</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none uppercase transition-colors"
                                                value={newClient.modelo}
                                                onChange={e => onClientChange("modelo", e.target.value.toUpperCase())}
                                                placeholder="Ej. Corolla"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6">
                                {/* Datos personales */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Datos personales</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Identificación (RUC/Cédula)</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none transition-colors"
                                                value={newClient.identificacion}
                                                onChange={e => onClientChange("identificacion", e.target.value)}
                                                placeholder="Ej: 010..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nombre completo</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none uppercase transition-colors"
                                                value={newClient.nombre}
                                                onChange={e => onClientChange("nombre", e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Teléfono / Celular</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none transition-colors"
                                                value={newClient.telefono}
                                                onChange={e => onClientChange("telefono", e.target.value)}
                                                placeholder="09..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email</label>
                                            <input
                                                type="email"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none transition-colors"
                                                value={newClient.email}
                                                onChange={e => onClientChange("email", e.target.value)}
                                                placeholder="correo@ejemplo.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Datos del vehículo */}
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Car size={12} /> Datos del vehículo</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Placa</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-black text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none uppercase tracking-wider transition-colors"
                                                value={newClient.placa}
                                                onChange={e => onClientChange("placa", e.target.value.toUpperCase())}
                                                placeholder="AAA-0000"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Marca</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none uppercase transition-colors"
                                                value={newClient.marca}
                                                onChange={e => onClientChange("marca", e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Modelo</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-300 outline-none uppercase transition-colors"
                                                value={newClient.modelo}
                                                onChange={e => onClientChange("modelo", e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
