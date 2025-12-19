import React from "react";
import { User, CreditCard, Phone, MapPin, DollarSign, Calendar, Settings2 } from "lucide-react";
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

    // Lógica personalizada: Cuando cambia el precio manualmente
    // AHORA RECIBE EL NÚMERO DIRECTAMENTE gracias al SmartNumberInput
    const handlePriceChange = (newPrice: number) => {
        updateField('vehiclePrice', newPrice);
        // Calcular seguro al 3%
        if (newPrice > 0) {
            updateField('insuranceFee', Math.round(newPrice * 0.03));
        }
    };

    const handleVehicleSelect = (car: InventoryCarRow) => {
        updateField('selectedVehicle', car);
        if (car.price > 0) {
            updateField('insuranceFee', Math.round(car.price * 0.03));
        }
    };

    return (
        <div className="space-y-6 print:hidden">
            {/* Buscador */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <InventorySearch
                    inventory={inventory}
                    isLoading={isLoadingInventory}
                    selectedVehicle={values.selectedVehicle}
                    onSelect={handleVehicleSelect}
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
                        {/* Nota: Entrada ($) puede ser 0 válido, pero generalmente queremos ver vacío para escribir */}
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

            {/* Gastos */}
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