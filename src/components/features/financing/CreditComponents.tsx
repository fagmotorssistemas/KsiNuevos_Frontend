import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
    Car, Search, X, ChevronDown, User, CreditCard, 
    Phone, MapPin, DollarSign, Calendar, Settings2, 
    ChevronUp, FileText, Loader2 
} from "lucide-react";
// Importamos los tipos desde el hook
import type { SimulatorValues, SimulatorResults, InventoryCarRow } from "@/hooks/useCreditSimulator";

// --- UTILS ---
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
};

// --- SUB-COMPONENTE: INPUT GROUP ---
const InputGroup = ({ label, icon: Icon, children }: { label: string, icon?: any, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
        </label>
        {children}
    </div>
);

// --- COMPONENTE 1: BUSCADOR DE INVENTARIO ---
interface InventorySearchProps {
    inventory: InventoryCarRow[];
    selectedVehicle: InventoryCarRow | null;
    onSelect: (car: InventoryCarRow) => void;
    onClear: () => void;
    isLoading: boolean;
}

export const InventorySearch = ({ inventory, selectedVehicle, onSelect, onClear, isLoading }: InventorySearchProps) => {
    const [searchTerm, setSearchTerm] = useState(selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        // Validación segura
        const safeInventory = inventory || [];
        
        if (!searchTerm) return safeInventory;
        
        const q = searchTerm.toLowerCase();
        return safeInventory.filter(c =>
            c.brand?.toLowerCase().includes(q) ||
            c.model?.toLowerCase().includes(q) ||
            c.plate?.toLowerCase().includes(q) || // Aquí seguimos buscando por placa normal (útil para el vendedor)
            c.year?.toString().includes(q)
        );
    }, [searchTerm, inventory]);

    useEffect(() => {
        if(selectedVehicle) {
            setSearchTerm(`${selectedVehicle.brand} ${selectedVehicle.model}`);
        } else {
            setSearchTerm("");
        }
    }, [selectedVehicle]);

    useEffect(() => {
        const checkClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", checkClick);
        return () => document.removeEventListener("mousedown", checkClick);
    }, []);

    return (
        <div ref={dropdownRef} className="relative z-30">
            <InputGroup label="Vehículo del Inventario" icon={Car}>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </div>
                    <input
                        type="text"
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        placeholder={isLoading ? "Cargando inventario..." : "Buscar por placa, marca o modelo..."}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {searchTerm ? (
                            <X className="h-4 w-4 text-slate-400 cursor-pointer hover:text-red-500" onClick={() => { setSearchTerm(""); onClear(); }} />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                    </div>
                </div>
            </InputGroup>

            {isOpen && !isLoading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50">
                    <ul className="py-2">
                        <li className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-400 text-xs border-b border-slate-50" onClick={() => { onClear(); setSearchTerm(""); setIsOpen(false); }}>
                            -- No asignar vehículo específico --
                        </li>
                        {filtered.length > 0 ? (
                            filtered.map(car => (
                                <li key={car.id} onClick={() => { onSelect(car); setIsOpen(false); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group border-b border-slate-50 last:border-0">
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{car.brand} {car.model}</div>
                                        <div className="text-[10px] text-slate-500 uppercase flex gap-2">
                                            <span className="bg-slate-100 px-1 rounded">Año {car.year}</span>
                                            <span>{car.color || 'N/A'}</span> 
                                            {/* Aquí mostramos la placa normal para que el vendedor la identifique */}
                                            <span className=" text-slate-600">{car.plate || 'S/PLACA'}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                                        {formatCurrency(car.price)}
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-slate-400 text-center">No se encontraron vehículos</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE 2: FORMULARIO IZQUIERDO ---
interface CreditFormProps {
    values: SimulatorValues;
    results: SimulatorResults;
    inventory: InventoryCarRow[];
    isLoadingInventory: boolean;
    updateField: (field: keyof SimulatorValues, value: any) => void;
    updateDownPaymentByAmount: (amount: number) => void;
}

export function CreditForm({ values, results, inventory, isLoadingInventory, updateField, updateDownPaymentByAmount }: CreditFormProps) {
    return (
        <div className="space-y-6 print:hidden">
            {/* Buscador */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <InventorySearch
                    inventory={inventory}
                    isLoading={isLoadingInventory}
                    selectedVehicle={values.selectedVehicle}
                    onSelect={(car) => updateField('selectedVehicle', car)}
                    onClear={() => updateField('selectedVehicle', null)}
                />
            </div>

            {/* Datos Cliente */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <User className="w-5 h-5 text-blue-500" />
                    <h3>Datos del Solicitante</h3>
                </div>
                <InputGroup label="Nombre Completo">
                    <input type="text" value={values.clientName} onChange={(e) => updateField('clientName', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Ej: Juan Pérez" />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Cédula / RUC" icon={CreditCard}>
                        <input type="text" value={values.clientId} onChange={(e) => updateField('clientId', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" placeholder="171..." />
                    </InputGroup>
                    <InputGroup label="Teléfono" icon={Phone}>
                        <input type="text" value={values.clientPhone} onChange={(e) => updateField('clientPhone', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" placeholder="099..." />
                    </InputGroup>
                </div>
                <InputGroup label="Dirección" icon={MapPin}>
                    <input type="text" value={values.clientAddress} onChange={(e) => updateField('clientAddress', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" placeholder="Av. Principal..." />
                </InputGroup>
            </div>

            {/* Financiamiento */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                    <h3>Condiciones del Crédito</h3>
                </div>
                <InputGroup label="Precio del Vehículo ($)" icon={DollarSign}>
                    <input type="number" value={values.vehiclePrice} onChange={(e) => updateField('vehiclePrice', Number(e.target.value))} className="w-full px-3 py-2s font-bold bg-slate-50 border border-slate-200 rounded-lg" />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Entrada (%)">
                        <input type="number" value={values.downPaymentPercentage} onChange={(e) => updateField('downPaymentPercentage', Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
                    </InputGroup>
                    <InputGroup label="Entrada ($)">
                        <input type="number" value={results.downPaymentAmount} onChange={(e) => updateDownPaymentByAmount(Number(e.target.value))} className="w-full px-3 py-2  bg-slate-50 border border-slate-200 rounded-lg" />
                    </InputGroup>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Plazo (Meses)" icon={Calendar}>
                        <select value={values.termMonths} onChange={(e) => updateField('termMonths', Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            {[12, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} Meses</option>)}
                        </select>
                    </InputGroup>
                    <InputGroup label="Tasa Mensual (%)">
                        <input type="number" step="0.1" value={values.interestRateMonthly} onChange={(e) => updateField('interestRateMonthly', Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
                    </InputGroup>
                </div>
            </div>

            {/* Gastos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <Settings2 className="w-5 h-5 text-blue-500" />
                    <h3>Gastos Adicionales</h3>
                </div>
                <div className="space-y-4">
                    <InputGroup label="Gasto Administrativo ($)">
                        <input type="number" value={values.adminFee} onChange={(e) => updateField('adminFee', Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
                    </InputGroup>
                    <InputGroup label="Dispositivo Satelital / GPS ($)">
                        <input type="number" value={values.gpsFee} onChange={(e) => updateField('gpsFee', Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
                    </InputGroup>
                    <InputGroup label="Seguro / Póliza ($)">
                        <input type="number" value={values.insuranceFee} onChange={(e) => updateField('insuranceFee', Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
                    </InputGroup>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE 3: PROFORMA VISUAL (PDF) ---
interface CreditProformaProps {
    values: SimulatorValues;
    results: SimulatorResults;
    includeTableInPdf: boolean;
}

export function CreditProforma({ values, results, includeTableInPdf }: CreditProformaProps) {
    const [showTable, setShowTable] = useState(false);
    const printTableClass = includeTableInPdf ? "print:block" : "print:hidden";

    return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl print:shadow-none print:border-none print:p-0">
            {/* Logo y Cabecera */}
            <div className="flex items-center gap-8 mb-6">
                <img src="/logol.png" alt="Logo Ksi" className="object-contain w-[180px] h-[35px]" />
            </div>

            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Proforma de Financiamiento</h2>
                    <p className="text-slate-500 text-sm mt-1">Ksi-Nuevos | Financiamiento Directo</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500 mb-1">Fecha de Emisión</div>
                    <div className="font-medium text-slate-900">{new Date().toLocaleDateString('es-EC', { dateStyle: 'long' })}</div>
                </div>
            </div>

            {/* CAJAS DUALES (Side-by-side) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Datos del Solicitante */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 print:bg-transparent print:border-slate-200">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos del Solicitante</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div className="col-span-2">
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Cliente</span>
                            <span className="text-xs font-bold text-slate-900 block truncate">{values.clientName || "---"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Cédula / RUC</span>
                            <span className="text-xs font-bold text-slate-900 block">{values.clientId || "---"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Teléfono</span>
                            <span className="text-xs font-bold text-slate-900 block">{values.clientPhone || "---"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Dirección</span>
                            <span className="text-xs font-bold text-slate-900 block">{values.clientAddress || "---"}</span>
                        </div>
                    </div>
                </div>

                {/* Datos del Vehículo */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 print:bg-transparent print:border-slate-200">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vehículo de Interés</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div className="col-span-2">
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Marca y Modelo</span>
                            <span className="text-xs font-bold text-slate-900 block truncate">
                                {values.selectedVehicle
                                    ? `${values.selectedVehicle.brand} ${values.selectedVehicle.model}`.toUpperCase()
                                    : "SIN ESPECIFICAR"}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Año</span>
                            <span className="text-xs font-bold text-slate-900 block">
                                {values.selectedVehicle?.year || "---"}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Color</span>
                            <span className="text-xs font-bold text-slate-900 block truncate">
                                {(values.selectedVehicle?.color || "---").toUpperCase()}
                            </span>
                        </div>
                        {/* CAMBIO AQUÍ: Ahora mostramos plate_short en vez de plate */}
                         {values.selectedVehicle?.plate_short && (
                            <div className="print:hidden">
                                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Placa </span>
                                <span className="text-xs font-bold text-slate-900 block truncate">
                                    {values.selectedVehicle.plate_short}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Resumen Principal */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Detalle Financiero</h3>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Precio Vehículo</span>
                        <span className="font-semibold text-slate-900 text-sm">{formatCurrency(values.vehiclePrice)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Entrada ({values.downPaymentPercentage.toFixed(0)}%)</span>
                        <span className="font-semibold text-green-600 text-sm">- {formatCurrency(results.downPaymentAmount)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-800 text-sm">Saldo Financiar</span>
                        <span className="font-bold text-slate-900 text-sm">{formatCurrency(results.vehicleBalance)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Gastos Operativos</h3>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Gastos Administrativos</span>
                        <span className="font-medium text-slate-900 text-sm">{formatCurrency(values.adminFee)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Dispositivo Satelital</span>
                        <span className="font-medium text-slate-900 text-sm">{formatCurrency(values.gpsFee)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Seguro</span>
                        <span className="font-medium text-slate-900 text-sm">{formatCurrency(values.insuranceFee)}</span>
                    </div>
                </div>
            </div>

            {/* TOTALES Y CUOTA */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8 print:bg-slate-50 print:border-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Capital (Saldo + Gastos)</span>
                            <span className="font-bold text-slate-900">{formatCurrency(results.totalCapital)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                            <span className="font-medium">Interés ({values.interestRateMonthly}% x {values.termMonths} meses)</span>
                            <span className="font-bold">+ {formatCurrency(results.totalInterest)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-base">
                            <span className="font-bold text-slate-800 uppercase">Total Deuda</span>
                            <span className="font-bold text-slate-900">{formatCurrency(results.totalDebt)}</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center print:border-slate-800">
                        <div className="text-sm text-slate-500 font-bold uppercase mb-1">Cuota Mensual Fija</div>
                        <div className="text-4xl font-black text-blue-600 print:text-black">
                            {formatCurrency(results.monthlyPayment)}
                        </div>
                        <div className="text-xs text-slate-400 mt-2 font-medium">
                            Plazo: {values.termMonths} Meses
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla Amortización */}
            <div className={`mt-8 ${printTableClass}`}>
                <button onClick={() => setShowTable(!showTable)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-4 print:hidden">
                    {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showTable ? "Ocultar Cronograma" : "Ver Cronograma de Pagos"}
                </button>
                <div className={`${showTable ? 'block' : 'hidden'} ${printTableClass}`}>
                    <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Cronograma de Pagos
                    </h3>
                    <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-100 uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-4 py-2">Cuota #</th>
                                <th className="px-4 py-2">Fecha Estimada</th>
                                <th className="px-4 py-2 text-right">Valor Cuota</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.schedule.map((item: any) => (
                                <tr key={item.cuotaNumber} className="border-b border-slate-50">
                                    <td className="px-4 py-1.5 font-bold text-slate-900">{item.cuotaNumber}</td>
                                    <td className="px-4 py-1.5 text-slate-600 capitalize">{item.date}</td>
                                    <td className="px-4 py-1.5 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-200 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
                <p>Esta cotización es referencial y aproximada. Precios y tasas sujetos a aprobación crediticia final.</p>
                <p>Generado automáticamente por Sistema de Gestión Concesionaria.</p>
            </div>
        </div>
    );
}