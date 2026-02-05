import React from "react";
import { User, CreditCard, Phone, MapPin, DollarSign, Calendar, Settings2, Car } from "lucide-react";
import { InputGroup, SimulatorValues, SimulatorResults, InventoryCarRow, SmartNumberInput } from "./FinancingUtils";
import { InventorySearch } from "./InventorySearch";

interface CreditFormProps {
    values: SimulatorValues;
    results: SimulatorResults;
    inventory: InventoryCarRow[];
    isLoadingInventory: boolean;
    updateField: (field: keyof SimulatorValues, value: any) => void;
    updateDownPaymentByAmount: (amount: number) => void;
}

export function CreditForm({ values, results, inventory, isLoadingInventory, updateField, updateDownPaymentByAmount }: CreditFormProps) {

    const handlePriceChange = (newPrice: number) => {
        updateField('vehiclePrice', newPrice);
        if (newPrice > 0) {
            updateField('insuranceFee', Math.round(newPrice * 0.03));
        }
    };

    const handleVehicleSelect = (car: InventoryCarRow) => {
        updateField('selectedVehicle', car);
        if (car.price && car.price > 0) {
            updateField('insuranceFee', Math.round(car.price * 0.03));
        }
    };

    // Función para actualizar datos manuales de forma segura
    const updateManualField = (key: keyof InventoryCarRow, value: any) => {
        const current = (values.selectedVehicle || {
            id: 'manual',
            brand: '',
            model: '',
            year: new Date().getFullYear(),
            price: values.vehiclePrice
        }) as InventoryCarRow;
        
        // Lógica específica para el año: limitar a 4 dígitos
        if (key === 'year') {
            const yearStr = value.toString();
            if (yearStr.length > 4) return; // No actualizar si excede 4 dígitos
        }

        updateField('selectedVehicle', { ...current, [key]: value });
    };

    // Identificadores de estado
    const isManual = values.selectedVehicle?.id === 'manual';
    const hasNoSelection = !values.selectedVehicle;

    return (
        <div className="space-y-6 print:hidden">
            {/* 1. BUSCADOR DE INVENTARIO */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <InventorySearch
                    inventory={inventory}
                    isLoading={isLoadingInventory}
                    selectedVehicle={isManual ? null : values.selectedVehicle}
                    onSelect={handleVehicleSelect}
                    onClear={() => updateField('selectedVehicle', null)}
                />
            </div>

            {/* 2. DATOS MANUALES (Bloque independiente) */}
            {(hasNoSelection || isManual) && (
                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-blue-500" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Vehículo No Registrado
                            </h3>
                        </div>
                        {isManual && (
                            <button 
                                onClick={() => updateField('selectedVehicle', null)}
                                className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <InputGroup label="Marca y Modelo">
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-900"
                                placeholder="Ej: Toyota Hilux"
                                value={values.selectedVehicle?.brand || ""}
                                onChange={(e) => {
                                    // Guardamos todo en 'brand' y limpiamos 'model' para la proforma
                                    const val = e.target.value;
                                    const current = (values.selectedVehicle || { id: 'manual' }) as InventoryCarRow;
                                    updateField('selectedVehicle', { ...current, brand: val, model: '' });
                                }}
                            />
                        </InputGroup>

                        <InputGroup label="Año del Auto">
                            <SmartNumberInput
                                value={values.selectedVehicle?.year || 0}
                                onValueChange={(val) => updateManualField('year', val)}
                                placeholder="Ej: 2024"
                                className="text-slate-900"
                                // Aunque SmartNumberInput es un wrapper, el input nativo ayuda
                                maxLength={4} 
                            />
                        </InputGroup>
                    </div>
                </div>
            )}

            {/* 3. DATOS DEL SOLICITANTE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <User className="w-5 h-5 text-blue-500" />
                    <h3>Datos del Solicitante</h3>
                </div>
                <InputGroup label="Nombre Completo">
                    <input type="text" value={values.clientName} onChange={(e) => updateField('clientName', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900" placeholder="Ej: Juan Pérez" />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Cédula / RUC" icon={CreditCard}>
                        <input type="text" value={values.clientId} onChange={(e) => updateField('clientId', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" placeholder="171..." />
                    </InputGroup>
                    <InputGroup label="Teléfono" icon={Phone}>
                        <input type="text" value={values.clientPhone} onChange={(e) => updateField('clientPhone', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" placeholder="099..." />
                    </InputGroup>
                </div>
                <InputGroup label="Dirección" icon={MapPin}>
                    <input type="text" value={values.clientAddress} onChange={(e) => updateField('clientAddress', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" placeholder="Av. Principal..." />
                </InputGroup>
            </div>

            {/* 4. CONDICIONES DEL CRÉDITO */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                    <h3>Condiciones del Crédito</h3>
                </div>
                <InputGroup label="Precio del Vehículo ($)" icon={DollarSign}>
                    <SmartNumberInput
                        value={values.vehiclePrice}
                        onValueChange={handlePriceChange}
                        className="font-bold text-slate-900"
                        placeholder="0.00"
                    />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Entrada (%)">
                        <SmartNumberInput
                            value={values.downPaymentPercentage}
                            onValueChange={(val) => updateField('downPaymentPercentage', val)}
                        />
                    </InputGroup>
                    <InputGroup label="Entrada ($)">
                        <SmartNumberInput
                            value={results.downPaymentAmount}
                            onValueChange={(val) => updateDownPaymentByAmount(val)}
                        />
                    </InputGroup>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Plazo (Meses)" icon={Calendar}>
                        <SmartNumberInput
                            value={values.termMonths}
                            onValueChange={(val) => updateField('termMonths', val)}
                            className="font-medium"
                            placeholder="Ej: 36"
                        />
                    </InputGroup>
                    <InputGroup label="Tasa Mensual (%)">
                        <SmartNumberInput
                            step="0.1"
                            value={values.interestRateMonthly}
                            onValueChange={(val) => updateField('interestRateMonthly', val)}
                        />
                    </InputGroup>
                </div>
            </div>

            {/* 5. GASTOS ADICIONALES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <Settings2 className="w-5 h-5 text-blue-500" />
                    <h3>Gastos Adicionales</h3>
                </div>
                <div className="space-y-4">
                    <InputGroup label="Gasto Administrativo ($)">
                        <SmartNumberInput
                            value={values.adminFee}
                            onValueChange={(val) => updateField('adminFee', val)}
                        />
                    </InputGroup>
                    <InputGroup label="Dispositivo Satelital / GPS ($)">
                        <SmartNumberInput
                            value={values.gpsFee}
                            onValueChange={(val) => updateField('gpsFee', val)}
                        />
                    </InputGroup>
                    <InputGroup label="Seguro / Póliza (3% Estimado)">
                        <SmartNumberInput
                            value={values.insuranceFee}
                            onValueChange={(val) => updateField('insuranceFee', val)}
                        />
                    </InputGroup>
                </div>
            </div>
        </div>
    );
}